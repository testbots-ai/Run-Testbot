import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

// ─── Types ──────────────────────────────────────────────────────────────────

interface UrlDetail {
  key: string;
  value: string;
}

interface JwtPayload {
  organizationId: string;
  organizationName?: string;
  partnerId?: string;
  tokenType?: string;
  urlDetails: UrlDetail[];
  iat?: number;
  exp?: number;
}

interface TestBotConfiguration {
  testBotId: string;
  name?: string;
  projectId?: string;
  executionConfiguration?: {
    baseUrl?: string;
    browser?: string;
    browserVersion?: string;
    closeBrowserAfterEachExecution?: boolean;
    customProperties?: Array<{
      customPropertyId: string;
      name: string;
      value: string;
      type?: string;
    }>;
    type?: string;
    gridId?: string;
    excludeToBeRepairedTest?: boolean;
    gridUrl?: string;
    gridUrlForExecution?: string;
    osType?: string;
    resolution?: string;
    screenshotAfterEachStep?: boolean;
    screenshotOnError?: boolean;
    screenshotOnFinish?: boolean;
    timeout?: number;
    waitForElementTimeout?: number;
    delayBetweenSteps?: number;
  };
}

interface ExecutionStatus {
  executionId: string;
  status: string;
  message?: string;
}

interface ExecutionResult {
  executionId: string;
  status: string;
  totalTests?: number;
  passedTests?: number;
  failedTests?: number;
  skippedTests?: number;
  testSuites?: unknown[];
  errorMessages?: string[];
  screenshotUrls?: string[];
  videoUrls?: string[];
  startTime?: string;
  endTime?: string;
  duration?: number;
  [key: string]: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function decodeJwt(token: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format: expected 3 parts separated by dots');
  }
  const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const decoded = Buffer.from(padded, 'base64').toString('utf-8');
  try {
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    throw new Error('Failed to parse JWT payload as JSON');
  }
}

function extractExecutorUrl(payload: JwtPayload): string {
  const entry = payload.urlDetails?.find((u) => u.key === 'executorServiceApiUrl');
  if (!entry?.value) {
    throw new Error('JWT does not contain urlDetails entry with key "executorServiceApiUrl"');
  }
  return entry.value.replace(/\/$/, '');
}

function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function authFetch(
  url: string,
  jwtToken: string,
  options: Record<string, unknown> = {}
): Promise<unknown> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    },
  } as Parameters<typeof fetch>[1]);

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} from ${url}\nBody: ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ─── Core workflow ────────────────────────────────────────────────────────────

async function triggerExecution(
  executorUrl: string,
  jwtToken: string,
  config: TestBotConfiguration
): Promise<string> {
  const url = `${executorUrl}/rest/api/testops/${config.testBotId}/execute`;
  core.info(`🚀 Triggering test bot execution...`);
  core.info(`   Endpoint : ${url}`);
  core.info(`   Test Bot : ${config.name ?? config.testBotId}`);

  const result = (await authFetch(url, jwtToken, {
    method: 'POST',
    body: JSON.stringify(config),
  })) as { executionId?: string; id?: string };

  const executionId = result.executionId ?? result.id;
  if (!executionId) {
    throw new Error(`Trigger did not return executionId. Response: ${JSON.stringify(result)}`);
  }
  core.info(`✅ Execution triggered. ID: ${executionId}`);
  return executionId;
}

async function pollStatus(
  executorUrl: string,
  jwtToken: string,
  executionId: string,
  pollIntervalSeconds: number,
  timeoutMinutes: number
): Promise<ExecutionStatus> {
  const statusUrl = `${executorUrl}/rest/api/testops/execution/${executionId}/status`;
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const startTime = Date.now();
  const terminalStatuses = new Set(['COMPLETED', 'PASSED', 'FAILED', 'ERROR', 'CANCELLED', 'ABORTED', 'SUCCESS']);

  core.info(`⏳ Polling every ${pollIntervalSeconds}s (timeout: ${timeoutMinutes}m)...`);

  while (true) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= timeoutMs) {
      throw new Error(`Timeout: execution did not complete within ${timeoutMinutes} minutes`);
    }
    await sleep(pollIntervalSeconds);
    const statusData = (await authFetch(statusUrl, jwtToken)) as ExecutionStatus;
    const status = (statusData.status ?? '').toUpperCase();
    core.info(`   Status: ${status} (elapsed: ${Math.round(elapsed / 1000)}s)`);
    if (terminalStatuses.has(status)) {
      return { ...statusData, status };
    }
  }
}

async function fetchDetailedResults(
  executorUrl: string,
  jwtToken: string,
  executionId: string
): Promise<ExecutionResult> {
  const url = `${executorUrl}/rest/api/testops/execution/${executionId}/detailed-results`;
  core.info(`📋 Fetching detailed results...`);
  return (await authFetch(url, jwtToken)) as ExecutionResult;
}

function saveResults(results: ExecutionResult, executionId: string): string {
  const dir = path.join(process.cwd(), 'results');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `execution-${executionId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf-8');
  core.info(`💾 Results saved to ${filePath}`);
  return filePath;
}

function printSummary(results: ExecutionResult): void {
  core.info('');
  core.info('══════════════════════════════════════════════════');
  core.info('                  TEST BOT RESULTS                ');
  core.info('══════════════════════════════════════════════════');
  core.info(`  Execution ID : ${results.executionId}`);
  core.info(`  Status       : ${results.status}`);
  if (results.totalTests  !== undefined) core.info(`  Total Tests  : ${results.totalTests}`);
  if (results.passedTests !== undefined) core.info(`  ✅ Passed   : ${results.passedTests}`);
  if (results.failedTests !== undefined) core.info(`  ❌ Failed   : ${results.failedTests}`);
  if (results.skippedTests !== undefined) core.info(`  ⏭  Skipped  : ${results.skippedTests}`);
  if (results.startTime)                 core.info(`  Start Time   : ${results.startTime}`);
  if (results.endTime)                   core.info(`  End Time     : ${results.endTime}`);
  if (results.duration !== undefined)    core.info(`  Duration     : ${results.duration}s`);
  if (results.errorMessages?.length) {
    core.info('  Errors:');
    results.errorMessages.forEach((m) => core.info(`    • ${m}`));
  }
  if (results.screenshotUrls?.length) {
    core.info('  Screenshots:');
    results.screenshotUrls.forEach((u) => core.info(`    🖼  ${u}`));
  }
  if (results.videoUrls?.length) {
    core.info('  Videos:');
    results.videoUrls.forEach((u) => core.info(`    🎬 ${u}`));
  }
  core.info('══════════════════════════════════════════════════');
  core.info('');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  try {
    const jwtToken          = core.getInput('jwt_token', { required: true });
    const testBotConfigRaw  = core.getInput('test_bot_configuration', { required: true });
    const pollInterval      = parseInt(core.getInput('poll_interval_seconds') || '5', 10);
    const timeoutMinutes    = parseInt(core.getInput('timeout_minutes') || '60', 10);

    core.info('🔑 Parsing JWT token...');
    const payload = decodeJwt(jwtToken);
    core.info(`   Organization : ${payload.organizationId}`);
    if (payload.organizationName) core.info(`   Org Name     : ${payload.organizationName}`);

    const executorUrl = extractExecutorUrl(payload);
    core.info(`   Executor URL : ${executorUrl}`);

    core.info('⚙️  Parsing test bot configuration...');
    let testBotConfig: TestBotConfiguration;
    try {
      testBotConfig = JSON.parse(testBotConfigRaw) as TestBotConfiguration;
    } catch (e) {
      throw new Error(`Invalid JSON in test_bot_configuration: ${(e as Error).message}`);
    }
    if (!testBotConfig.testBotId) {
      throw new Error('testBotConfiguration must include a "testBotId" field');
    }
    core.info(`   Test Bot ID  : ${testBotConfig.testBotId}`);
    if (testBotConfig.name) core.info(`   Test Bot Name: ${testBotConfig.name}`);

    const executionId = await triggerExecution(executorUrl, jwtToken, testBotConfig);
    core.setOutput('execution_id', executionId);

    const finalStatus = await pollStatus(executorUrl, jwtToken, executionId, pollInterval, timeoutMinutes);

    let results: ExecutionResult;
    try {
      results = await fetchDetailedResults(executorUrl, jwtToken, executionId);
    } catch (e) {
      core.warning(`Could not fetch detailed results: ${(e as Error).message}`);
      results = { executionId, status: finalStatus.status };
    }

    const resultsPath = saveResults(results, executionId);
    core.setOutput('results_path', resultsPath);
    printSummary(results);

    const statusUpper = finalStatus.status.toUpperCase();
    core.setOutput('status', statusUpper);

    if (new Set(['FAILED', 'ERROR', 'ABORTED']).has(statusUpper)) {
      core.setFailed(`Test bot execution finished with status: ${statusUpper}`);
    } else {
      core.info(`🎉 Test bot execution finished with status: ${statusUpper}`);
    }
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}

run();
