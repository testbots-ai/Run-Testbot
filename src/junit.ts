import * as fs from 'fs';
import * as path from 'path';

// ── Types ────────────────────────────────────────────────────────────────────

interface TestScriptResult {
  testScriptName?: string;
  name?: string;
  resultStatus: 'PASSED' | 'FAILED' | 'ERROR' | 'SKIPPED' | string;
  errorMessage?: string;
  duration?: number; // seconds
}

interface TestSuiteResult {
  testSuiteName?: string;
  name?: string;
  testScriptResults?: TestScriptResult[];
  duration?: number; // seconds
}

interface TestBotResults {
  testSuiteResults?: TestSuiteResult[];
  testScriptResults?: TestScriptResult[];  // top-level fallback
  [key: string]: unknown;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Escape special XML characters */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Build a single <testcase> element */
function buildTestCase(script: TestScriptResult): string {
  const name = escapeXml(script.testScriptName ?? script.name ?? 'Unnamed Test');
  const time = (script.duration ?? 0).toFixed(3);
  const status = (script.resultStatus ?? '').toUpperCase();

  let inner = '';

  if (status === 'FAILED' || status === 'ERROR') {
    const msg = escapeXml(script.errorMessage ?? `Test ${status.toLowerCase()}`);
    inner = `\n      <failure message="${msg}" type="${status}">${msg}</failure>`;
  } else if (status === 'SKIPPED') {
    inner = `\n      <skipped/>`;
  }

  return `    <testcase name="${name}" time="${time}">${inner}\n    </testcase>`;
}

/** Build a <testsuite> element from a suite + its scripts */
function buildTestSuite(suite: TestSuiteResult, index: number): string {
  const suiteName = escapeXml(suite.testSuiteName ?? suite.name ?? `Suite ${index + 1}`);
  const scripts: TestScriptResult[] = suite.testScriptResults ?? [];

  const tests    = scripts.length;
  const failures = scripts.filter(s => ['FAILED', 'ERROR'].includes((s.resultStatus ?? '').toUpperCase())).length;
  const skipped  = scripts.filter(s => (s.resultStatus ?? '').toUpperCase() === 'SKIPPED').length;
  const time     = (suite.duration ?? scripts.reduce((sum, s) => sum + (s.duration ?? 0), 0)).toFixed(3);

  const testCases = scripts.map(buildTestCase).join('\n');

  return [
    `  <testsuite name="${suiteName}" tests="${tests}" failures="${failures}" skipped="${skipped}" errors="0" time="${time}">`,
    testCases,
    `  </testsuite>`,
  ].join('\n');
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Converts TestBot JSON results into a JUnit XML file at results/junit.xml.
 * Safe to call even if results is undefined/empty — will produce a valid empty report.
 */
export function generateJUnit(results: TestBotResults): void {
  try {
    // Resolve suites — handle both top-level and nested script results
    let suites: TestSuiteResult[] = results?.testSuiteResults ?? [];

    // Fallback: if there are no suites but there are top-level scripts, wrap them
    if (suites.length === 0 && results?.testScriptResults && results.testScriptResults.length > 0) {
      suites = [
        {
          testSuiteName: 'TestBot Results',
          testScriptResults: results.testScriptResults,
        },
      ];
    }

    // Aggregate totals
    const allScripts = suites.flatMap(s => s.testScriptResults ?? []);
    const totalTests    = allScripts.length;
    const totalFailures = allScripts.filter(s => ['FAILED', 'ERROR'].includes((s.resultStatus ?? '').toUpperCase())).length;
    const totalSkipped  = allScripts.filter(s => (s.resultStatus ?? '').toUpperCase() === 'SKIPPED').length;
    const totalTime     = allScripts.reduce((sum, s) => sum + (s.duration ?? 0), 0).toFixed(3);

    const suiteXml = suites.map((suite, i) => buildTestSuite(suite, i)).join('\n');

    const xml = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<testsuites name="TestBot" tests="${totalTests}" failures="${totalFailures}" skipped="${totalSkipped}" errors="0" time="${totalTime}">`,
      suiteXml,
      `</testsuites>`,
    ].join('\n');

    // Ensure output directory exists
    const outputDir = path.resolve('results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'junit.xml');
    fs.writeFileSync(outputPath, xml, 'utf8');

    console.log(`✅ JUnit XML written to: ${outputPath}`);
    console.log(`   Suites: ${suites.length} | Tests: ${totalTests} | Failures: ${totalFailures} | Skipped: ${totalSkipped}`);
  } catch (err) {
    // Never crash the main action — log and continue
    console.error('⚠️  generateJUnit failed (non-fatal):', err);
  }
}