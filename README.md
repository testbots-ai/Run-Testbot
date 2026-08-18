<p align="center">
  <img src="./assets/testbots-logo.png" width="100" />
</p>

# TestBot GitHub Action

Run TestBots directly from GitHub Actions and publish execution results inside your GitHub workflow.

---

# Overview

This GitHub Action allows you to:

* Execute TestBots from GitHub Actions
* Authenticate using a JWT token
* Override the Test Bot ID during execution
* Generate detailed execution reports
* Publish JUnit test results to GitHub Checks
* Upload execution artifacts for future reference
* Display execution summaries directly in GitHub Actions

---

# Getting This Action

This action is published on the **GitHub Marketplace**:

**https://github.com/marketplace/actions/run-testbot**

You can either grab the workflow from the Marketplace listing and drop it straight into your own repository, or copy it directly out of this repository at `.github/workflows/testbot-ci.yml`. Both give you the exact same workflow. For the full copy-pasteable version plus step-by-step setup, see [USAGE_GUIDE.md](USAGE_GUIDE.md).

---

# Prerequisites

Before using this action, ensure you have:

1. An TestBot created and configured.
2. A valid JWT token for API authentication.
3. A GitHub repository where this action is installed.
4. GitHub Actions enabled for the repository.

---

# Repository Structure

```text
.
├── .github/
│   └── workflows/
│       └── testbot-ci.yml
│
├── configs/
│   └── testbot-config.json
│
├── action.yml
├── package.json
├── dist/
└── README.md
```

---

# Step 1: Configure TestBot

Create a configuration file:

```text
configs/testbot-config.json
```

Example:

```json
{
  "name": "AHQ Premium Grid - DEV - Web - WIN11 - Chrome",
  "testBotId": "f1da9b63-4103-42ed-9d7d-e3371d67f7b5",
  "executionConfiguration": {
    "browser": "Chrome",
    "browserVersion": "latest",
    "type": "Web",
    "osType": "WIN11",
    "resolution": "1920x1200",
    "timeout": 30,
    "waitForElementTimeout": 10,
    "customProperties": [
      {
        "name": "username",
        "value": "user@example.com",
        "type": "0"
      },
      {
        "name": "password",
        "value": "password",
        "type": "0"
      }
    ]
  }
}
```

---

## Required Fields

| Field                    | Description                       |
| ------------------------ | --------------------------------- |
| `testBotId`              | Unique TestBot ID    |
| `name`                   | Execution profile name            |
| `executionConfiguration` | Test execution settings           |
| `browser`                | Browser to execute tests          |
| `osType`                 | Target operating system           |
| `customProperties`       | Runtime variables used by TestBot |

---

# Step 2: Add JWT Token Secret

Navigate to:

```text
GitHub Repository
→ Settings
→ Secrets and Variables
→ Actions
→ New Repository Secret
```

Create the following secret:

| Secret Name         | Description                           |
| ------------------- | ------------------------------------- |
| `TESTBOT_JWT_TOKEN` | JWT Authentication Token |

---

# Step 3: Create GitHub Workflow

Create the file:

```text
.github/workflows/testbot-ci.yml
```

This repository's own `.github/workflows/testbot-ci.yml` is the reference implementation — see "Recommended Workflow" below for where to get a copy.

## GitHub Workflow Features

The provided GitHub workflow not only executes your TestBot but also generates a complete execution dashboard inside GitHub Actions.

### Included Features

| Feature                    | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| TestBot Execution          | Executes TestBots directly from GitHub Actions |
| Dynamic Configuration      | Supports runtime TestBot ID override                        |
| Execution Monitoring       | Continuously polls execution status until completion        |
| Raw JSON Results           | Displays complete execution payload                         |
| JUnit XML Generation       | Generates CI/CD compatible test reports                     |
| Markdown Report Generation | Creates human-readable execution reports                    |
| GitHub Job Summary         | Publishes rich execution results in the Summary tab         |
| GitHub Checks Integration  | Displays test results directly in GitHub Checks             |
| Artifact Upload            | Stores reports for download and auditing                    |

---

## Recommended Workflow

The current, fully-featured workflow — config validation, resilient polling with clear failure reasons surfaced in the Job Summary, JUnit + Markdown report generation, and GitHub Checks integration — lives in this repository at:

```text
.github/workflows/testbot-ci.yml
```

Copy that file directly into your own repository's `.github/workflows/` directory. For the complete, copy-pasteable version along with step-by-step setup (including how to get it from the [GitHub Marketplace listing](https://github.com/marketplace/actions/run-testbot)), see [USAGE_GUIDE.md](USAGE_GUIDE.md).

---

# Installing via the GitHub Marketplace Action

This is a separate, lighter-weight way to use this action: instead of copying the full bash-based workflow above, you add the pre-built action as a single `uses:` step in your own workflow. It's published on the GitHub Marketplace:

**https://github.com/marketplace/actions/run-testbot**

> **Run TestBot**
> Run TestBot with JWT-based authentication for CI/CD pipelines

## Step 1: Add the JWT Token Secret

Same as [Step 2](#step-2-add-jwt-token-secret) above — in your own repository:

```text
Settings → Secrets and Variables → Actions → New Repository Secret
```

| Secret Name | Description |
| --- | --- |
| `TESTBOT_JWT_TOKEN` | JWT Authentication Token |

## Step 2: Copy the Installation Snippet

Per the Marketplace listing's **Installation** section, paste this into your `.yml` file:

```yaml
- name: Run TestBot
  uses: testbots-ai/Run-Testbot@v1.0.1
```

> Learn more about this action in [testbots-ai/Run-Testbot](https://github.com/testbots-ai/Run-Testbot).

This snippet alone won't run as-is — `jwt_token` and `test_bot_configuration` are required inputs (see [Action Inputs](#action-inputs) below), so you need to add a `with:` block.

## Step 3: Add the Required Inputs

```yaml
- name: Run TestBot
  id: testbot
  uses: testbots-ai/Run-Testbot@v1.0.1
  timeout-minutes: 350
  with:
    jwt_token: ${{ secrets.TESTBOT_JWT_TOKEN }}
    test_bot_configuration: ${{ steps.prepare-config.outputs.config }}
    poll_interval_seconds: '5'
    timeout_minutes: '345'
```

`test_bot_configuration` expects a stringified JSON blob — your `configs/testbot-config.json`. Step 4 shows how to produce it.

## Step 4: Full Example Workflow

Save this as `.github/workflows/testbot.yml`:

```text
.
├── .github/
│   └── workflows/
│       └── testbot.yml
│
└── configs/
    └── testbot-config.json
```

```yaml
name: Run TestBot

on:
  workflow_dispatch:

jobs:
  run-testbot:
    runs-on: ubuntu-latest
    timeout-minutes: 358

    steps:
      - uses: actions/checkout@v4

      - name: Load Configuration
        id: prepare-config
        run: |
          CONFIG=$(cat configs/testbot-config.json)
          EOF=$(dd if=/dev/urandom bs=15 count=1 status=none | base64)
          echo "config<<$EOF" >> $GITHUB_OUTPUT
          echo "$CONFIG" >> $GITHUB_OUTPUT
          echo "$EOF" >> $GITHUB_OUTPUT

      - name: Run TestBot
        id: testbot
        uses: testbots-ai/Run-Testbot@v1.0.1
        timeout-minutes: 350
        with:
          jwt_token: ${{ secrets.TESTBOT_JWT_TOKEN }}
          test_bot_configuration: ${{ steps.prepare-config.outputs.config }}
          poll_interval_seconds: '5'
          timeout_minutes: '345'

      - name: Show Results
        if: always()
        run: |
          echo "Execution ID: ${{ steps.testbot.outputs.execution_id }}"
          echo "Status: ${{ steps.testbot.outputs.status }}"
          echo "Results Path: ${{ steps.testbot.outputs.results_path }}"

      - name: Publish Test Results
        if: always()
        uses: EnricoMi/publish-unit-test-result-action@v2
        with:
          files: results/junit.xml

      - name: Upload Reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: testbot-results-${{ github.run_number }}
          path: results/
```

This is intentionally pinned to `@v1.0.1`, not a floating tag — when a new version is published, bump this one line yourself (e.g. to `@v1.0.2`) to move to it; nothing else in the file changes.

> Unlike the vendored `testbot-ci.yml` workflow, the packaged action writes its JUnit report to a fixed path, `results/junit.xml`, and its raw results JSON to `results/execution-<executionId>.json` (the exact path is returned in the `results_path` output) — different filenames than the vendored workflow's `results/junit-results.xml` and `results/execution-result.json`. It also reads the TestOps executor URL directly out of the `jwt_token` you pass in, so no `TESTOPS_BASE_URL` env var is needed.

## Step 5: Run It

Trigger the workflow manually (`workflow_dispatch`) from the **Actions** tab of your repository. See [Action Inputs](#action-inputs) and [Action Outputs](#action-outputs) below for the full reference.

---

# Rich GitHub Reporting

After execution completes, users can review results directly within GitHub without downloading any files.

## 1. Workflow Summary

A detailed execution report is automatically published to:

GitHub Actions → Workflow Run → Summary

The summary contains:

* Execution ID
* TestBot Name
* Final Status
* Execution Duration
* Total Suites
* Passed Suites
* Failed Suites
* Total Scripts
* Passed Scripts
* Failed Scripts
* Step-Level Results

Example:

```text
🤖 TestBot Execution Report

Execution ID: 123456

Bot: Login Regression Suite

Status: PASSED

Duration: 00:03:42

Summary

Total Suites: 5
Passed Suites: 5
Failed Suites: 0

Total Scripts: 28
Passed Scripts: 28
Failed Scripts: 0
```

---

## 2. GitHub Checks Integration

JUnit reports are automatically published to GitHub Checks.

Benefits:

* Pass/Fail indicators
* Test result visibility
* Pull Request integration
* CI/CD compliance

Users can open the Checks tab and view failed test cases immediately.

---

## 3. Detailed Markdown Report

A comprehensive Markdown report is generated:

```text
results/report.md
```

The report includes:

* Suite-level results
* Script-level results
* Iteration-level details
* Step execution status
* Pass/Fail indicators

Example:

```text
Suite: Login Tests

✅ Successful Login

| Step | Status | Description |
|------|--------|-------------|
| 1 | PASSED | Open Login Page |
| 2 | PASSED | Enter Username |
| 3 | PASSED | Enter Password |
| 4 | PASSED | Click Login |
```

---

## 4. Raw Execution Results

The complete execution response from the TestBot platform is available as JSON:

```text
results/execution-result.json
```

Useful for:

* Debugging
* Auditing
* Custom reporting
* External integrations

---

## 5. Downloadable Artifacts

All generated reports are uploaded automatically.

Navigate to:

GitHub Actions → Workflow Run → Artifacts

Download:

```text
testbot-results-<run_number>
```

Included files:

```text
results/
├── junit-results.xml
├── report.md
├── execution-result.json
└── additional result files
```

---

# What Users See After Running the Workflow

```text
GitHub Actions
│
├── Workflow Logs
│   ├── Configuration Loaded
│   ├── TestBot Started
│   ├── Execution Progress
│   └── Execution Completed
│
├── Summary Tab
│   ├── Execution Metrics
│   ├── Suite Results
│   ├── Script Results
│   └── Step Results
│
├── Checks Tab
│   └── JUnit Test Results
│
└── Artifacts
    ├── report.md
    ├── junit-results.xml
    └── execution-result.json
```

This provides a complete test execution experience directly within GitHub, making it easy for QA engineers, developers, and release teams to review TestBot results without leaving the GitHub Actions interface.



---


# Action Inputs

> These inputs apply only when consuming the packaged action directly (`uses: testbots-ai/Run-Testbot@<version>`) as defined in `action.yml`. The workflow documented in [USAGE_GUIDE.md](USAGE_GUIDE.md) and `.github/workflows/testbot-ci.yml` instead reads `configs/testbot-config.json` and the `TESTBOT_JWT_TOKEN` secret directly, and controls polling/timeouts via the `POLL_INTERVAL_SECONDS` / `POLL_TIMEOUT_MINUTES` env vars and job/step `timeout-minutes`.

| Input                    | Required | Default | Description                                 |
| ------------------------ | -------- | ------- | ------------------------------------------- |
| `jwt_token`              | Yes      | -       | JWT token used for authentication           |
| `test_bot_configuration` | Yes      | -       | Full TestBot configuration JSON             |
| `poll_interval_seconds`  | No       | 5       | Polling interval while execution is running |
| `timeout_minutes`        | No       | 60      | Maximum wait time for execution completion  |

> The action's built-in default, `timeout_minutes: 60`, is only enough for short runs. TestBot executions can legitimately take up to ~5h45m, which is why the [Marketplace Action example above](#step-3-add-the-required-inputs) already sets `timeout_minutes: '345'` with the step's `timeout-minutes: 350` and the job's `timeout-minutes: 358` a few minutes above it (matching the vendored workflow's `POLL_TIMEOUT_MINUTES: 345` — see [USAGE_GUIDE.md](USAGE_GUIDE.md)) — all still under GitHub's hard 360-minute (6h) per-job cap for `ubuntu-latest` runners. If your own runs are shorter, you can safely lower all three.

---

# Action Outputs

| Output         | Description                        |
| -------------- | ---------------------------------- |
| `execution_id` | TestBot execution identifier       |
| `status`       | Final execution status             |
| `results_path` | Location of generated results JSON |

Example:

```yaml
- name: Show Results
  run: |
    echo "Execution ID: ${{ steps.testbot.outputs.execution_id }}"
    echo "Status: ${{ steps.testbot.outputs.status }}"
    echo "Results Path: ${{ steps.testbot.outputs.results_path }}"
```

---

# Generated Reports

After execution completes, the workflow automatically generates:

## Raw Result JSON

```text
results/execution-result.json
```

Contains complete execution details returned by the TestBot API.

---

## JUnit XML

```text
results/junit-results.xml
```

Used for:

* GitHub Checks
* CI/CD integrations
* Test reporting tools

---

## Markdown Report

```text
results/report.md
```

Contains:

* Execution summary
* Suite results
* Script results
* Step-level execution details

---

# GitHub Actions Summary

A detailed execution report is automatically published to:

```text
GitHub Actions
→ Workflow Run
→ Summary
```

This includes:

* Execution ID
* TestBot Name
* Status
* Duration
* Suite Summary
* Script Summary
* Step Results

---

# GitHub Checks Integration

JUnit results are published automatically as GitHub Checks.

Features:

* Pass/Fail indicators
* Test statistics
* Pull Request visibility
* Workflow integration

---

# Downloading Artifacts

Execution reports are uploaded as workflow artifacts.

Navigate to:

```text
GitHub Actions
→ Workflow Run
→ Artifacts
```

Download:

```text
testbot-results-<run_number>
```

Included files:

```text
results/
├── junit-results.xml
├── report.md
└── *.json
```

---

# Example Workflow Execution

```text
1. User triggers workflow
2. Configuration loaded
3. JWT authentication performed
4. TestBot execution started
5. Workflow polls execution status
6. Results downloaded
7. JUnit report generated
8. Markdown report generated
9. Results published to GitHub Checks
10. Artifacts uploaded
11. Summary displayed in GitHub Actions
```

---

# Troubleshooting

## Authentication Failure

Verify:

* JWT token exists in GitHub Secrets
* Token is valid and not expired

Required secret:

```text
TESTBOT_JWT_TOKEN
```

---

## Invalid TestBot ID

Verify:

* `testBotId` exists
* TestBot is accessible
* Correct environment is being used

---

## Workflow Timeout

If using the packaged action (`uses: testbots-ai/Run-Testbot@<version>`), increase all three together — see [Step 3](#step-3-add-the-required-inputs) above:

```yaml
- name: Run TestBot
  uses: testbots-ai/Run-Testbot@v1.0.1
  timeout-minutes: 350
  with:
    timeout_minutes: '345'
```

...and your job's `timeout-minutes: 358`.

If using the `.github/workflows/testbot-ci.yml` workflow (see [USAGE_GUIDE.md](USAGE_GUIDE.md)), the current defaults are already set right at GitHub's cap:

| Setting | Default | Where |
| --- | --- | --- |
| `POLL_TIMEOUT_MINUTES` | `345` | `env:` block — how long the script polls before giving up |
| Job `timeout-minutes` | `358` | `jobs.run-testbot` — job-level backstop |
| Step `timeout-minutes` | `350` | "Trigger and Poll TestBot Execution" step |

Keep both `timeout-minutes` values a few minutes above `POLL_TIMEOUT_MINUTES`, and all of them under GitHub's hard 360-minute (6h) per-job cap for `ubuntu-latest` runners — a self-hosted runner has no such cap if you need longer.

Or reduce execution time inside the TestBot.

---

# Usage Guide

<details>
<summary>Click to expand the full usage guide (also available standalone as <code>USAGE_GUIDE.md</code>)</summary>


This guide summarizes how to run TestBots from GitHub Actions using this repository, and how to get the workflow into your own repository via the **GitHub Marketplace** listing.

---

### What This Action Does

* Executes TestBots from GitHub Actions
* Authenticates using a JWT token
* Supports overriding the Test Bot ID at runtime
* Polls execution status until completion
* Generates JUnit XML + Markdown execution reports
* Publishes results to the GitHub Job Summary and GitHub Checks
* Uploads execution artifacts (JSON, XML, Markdown) for later review

---

### Repository Structure

```text
.
├── .github/
│   └── workflows/
│       └── testbot-ci.yml
│
├── configs/
│   └── testbot-config.json
│
└── README.md
```

---

### Ways to Use This Action

| Approach | When to use it |
| --- | --- |
| **Option A: GitHub Marketplace listing (copy the workflow)** | You want a single, canonical place to find the current workflow and copy it into your repo. Gets you the full bash-based workflow — config validation, resilient polling with clear failure reasons, JUnit + Markdown reporting, GitHub Job Summary/Checks integration. |
| **Option B: Copy directly from this repo** | You already have this repository checked out and just want to copy `.github/workflows/testbot-ci.yml` yourself. Identical result to Option A. |
| **Option C: Install the packaged Marketplace action (`uses:` step)** | You want a single `uses:` step instead of a bash script — no workflow file to maintain, but a slightly different feature set (see Option C below). |

---

### Option A: Use the Action from GitHub Marketplace

The action is published on the GitHub Marketplace:

**https://github.com/marketplace/actions/run-testbot**

#### Step 1: Add the JWT Token Secret

In your **own** repository (the one where you want to run the TestBot from):

```text
Settings → Secrets and Variables → Actions → New Repository Secret
```

| Secret Name | Description |
| --- | --- |
| `TESTBOT_JWT_TOKEN` | JWT authentication token for the TestBot API |

#### Step 2: Copy the Workflow

Create the file `.github/workflows/testbot-ci.yml` in your own repository (the same workflow file this action's repository uses for its own CI) with the following contents:

```yaml
name: Run TestBot

on:
  workflow_dispatch:

permissions:
  contents: read
  checks: write
  pull-requests: write

concurrency:
  group: ${{ github.workflow }}
  cancel-in-progress: false

env:
  # AutomationHQ's executor API. We poll it directly instead of using a generic
  # third-party GitHub Action so that every failure mode (bad config, unreachable
  # API, auth failure, timeout, malformed results) surfaces a clear reason in the
  # Job Summary instead of the run just going red with no explanation.
  TESTOPS_BASE_URL: https://api.automationhq.ai/ahq-test-bot-executor-services
  POLL_INTERVAL_SECONDS: 5
  # Test runs can legitimately take up to ~5h45m. This is set right at that ceiling,
  # while still staying under GitHub's hard, non-configurable 360-minute (6h) per-job
  # execution cap for ubuntu-latest runners. That cap cannot be raised via
  # timeout-minutes and applies to the WHOLE job, not just this step — if the test
  # bot execution itself needs a full 6h, ubuntu-latest cannot support it at all and
  # a self-hosted runner (no such cap) is required instead.
  POLL_TIMEOUT_MINUTES: 345

jobs:
  run-testbot:
    runs-on: ubuntu-latest
    # Job-level backstop above the poll step's own timeout, so a runaway job still
    # terminates instead of hanging indefinitely. Kept under GitHub's hard 360-minute
    # cap for ubuntu-latest, leaving a few minutes for setup/report/publish steps
    # that run before and after the poll step.
    timeout-minutes: 358

    steps:
      - uses: actions/checkout@v4

      - name: Load Config
        id: config
        run: |
          set -euo pipefail

          if [ ! -f configs/testbot-config.json ]; then
            REASON="configs/testbot-config.json not found in the repo"
            echo "::error::$REASON"
            echo "error_reason=$REASON" >> $GITHUB_OUTPUT
            exit 1
          fi

          if ! CONFIG=$(jq -c . configs/testbot-config.json 2>&1); then
            REASON="configs/testbot-config.json is not valid JSON: $(echo "$CONFIG" | tr '\n' ' ')"
            echo "::error::$REASON"
            echo "error_reason=$REASON" >> $GITHUB_OUTPUT
            exit 1
          fi

          TEST_BOT_ID=$(echo "$CONFIG" | jq -r '.testBotId // empty')
          if [ -z "$TEST_BOT_ID" ]; then
            REASON="configs/testbot-config.json is missing a \"testBotId\" field"
            echo "::error::$REASON"
            echo "error_reason=$REASON" >> $GITHUB_OUTPUT
            exit 1
          fi

          echo "config=$CONFIG" >> $GITHUB_OUTPUT

      - name: Trigger and Poll TestBot Execution
        id: testbot
        # A few minutes above POLL_TIMEOUT_MINUTES (not equal to it): if this were set to
        # the same value, GitHub's own step timeout could fire in a race against the
        # in-script timeout check, killing the step before it writes a clean error_reason.
        # This way the script's own timeout handling always wins and a "Reason" always
        # makes it to the summary.
        timeout-minutes: 350
        env:
          JWT_TOKEN: ${{ secrets.TESTBOT_JWT_TOKEN }}
          CONFIG_JSON: ${{ steps.config.outputs.config }}
        run: |
          set -euo pipefail
          mkdir -p results

          # Collapses newlines, escapes "|", and caps length so a raw API error body (which can
          # be an entire HTML error page from a gateway) never breaks or floods the markdown
          # table it ends up in inside the Job Summary step.
          sanitize() {
            local msg
            msg=$(echo "$1" | tr '\n\r' '  ' | sed 's/|/\\|/g')
            if [ ${#msg} -gt 500 ]; then
              echo "${msg:0:500}... (truncated)"
            else
              echo "$msg"
            fi
          }

          if [ -z "${JWT_TOKEN:-}" ]; then
            REASON="TESTBOT_JWT_TOKEN secret is not set (empty). Add it under Settings > Secrets and variables > Actions."
            echo "::error::$REASON"
            echo "error_reason=$REASON" >> $GITHUB_OUTPUT
            exit 1
          fi

          TEST_BOT_ID=$(echo "$CONFIG_JSON" | jq -r '.testBotId')
          TEST_BOT_NAME=$(echo "$CONFIG_JSON" | jq -r '.name')
          echo "   Test Bot ID  : $TEST_BOT_ID"
          echo "   Test Bot Name: $TEST_BOT_NAME"

          echo "🚀 Triggering test bot execution..."
          echo "   Endpoint : ${TESTOPS_BASE_URL}/rest/api/testops/${TEST_BOT_ID}/execute"

          # No --retry here: this POST triggers a real execution and is not idempotent. If the
          # request actually reached the server and only the response was lost (e.g. a timeout
          # waiting for a slow reply), an automatic retry could trigger the test bot a second
          # time. The two calls below (status check, detailed-results) are plain GETs, so they
          # retry safely.
          set +e
          TRIGGER_RESPONSE=$(curl -sS --fail-with-body -X POST \
            "${TESTOPS_BASE_URL}/rest/api/testops/${TEST_BOT_ID}/execute" \
            -H "Authorization: Bearer ${JWT_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "$CONFIG_JSON")
          CURL_EXIT=$?
          set -e

          if [ $CURL_EXIT -ne 0 ]; then
            REASON=$(sanitize "Trigger request failed (curl exit $CURL_EXIT — endpoint unreachable, timed out, or returned a non-2xx status, e.g. an invalid/expired JWT_TOKEN): $TRIGGER_RESPONSE")
            echo "::error::$REASON"
            echo "error_reason=$REASON" >> $GITHUB_OUTPUT
            exit 1
          fi

          EXECUTION_ID=$(echo "$TRIGGER_RESPONSE" | jq -r '.id // empty')
          if [ -z "$EXECUTION_ID" ]; then
            REASON=$(sanitize "Trigger response did not include an execution id: $(echo "$TRIGGER_RESPONSE" | jq -r '.message // .')")
            echo "::error::$REASON"
            echo "error_reason=$REASON" >> $GITHUB_OUTPUT
            exit 1
          fi

          echo "✅ Execution triggered. ID: $EXECUTION_ID"
          echo "execution_id=$EXECUTION_ID" >> $GITHUB_OUTPUT

          echo "⏳ Polling every ${POLL_INTERVAL_SECONDS}s (timeout: ${POLL_TIMEOUT_MINUTES}m)..."
          START_TIME=$SECONDS
          POLL_COUNT=0
          FINAL_STATUS="UNKNOWN"

          while true; do
            POLL_COUNT=$((POLL_COUNT + 1))
            ELAPSED=$((SECONDS - START_TIME))

            if [ $ELAPSED -gt $((POLL_TIMEOUT_MINUTES * 60)) ]; then
              REASON="Polling timed out after ${POLL_TIMEOUT_MINUTES} minutes. Last known status: $FINAL_STATUS"
              echo "::error::$REASON"
              echo "error_reason=$REASON" >> $GITHUB_OUTPUT
              exit 1
            fi

            set +e
            STATUS_RESPONSE=$(curl -sS --fail-with-body --retry 3 --retry-delay 5 \
              "${TESTOPS_BASE_URL}/rest/api/testops/execution/${EXECUTION_ID}/status?pollCount=${POLL_COUNT}")
            CURL_EXIT=$?
            set -e

            if [ $CURL_EXIT -ne 0 ]; then
              REASON=$(sanitize "Status check failed (curl exit $CURL_EXIT) after ${ELAPSED}s: $STATUS_RESPONSE")
              echo "::error::$REASON"
              echo "error_reason=$REASON" >> $GITHUB_OUTPUT
              exit 1
            fi

            FINAL_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status // "UNKNOWN"')
            echo "   Status: $FINAL_STATUS (elapsed: ${ELAPSED}s)"

            # ENQUEUED / PROCESSING / OPTIMIZATION_IN_PROGRESS are the only "still running"
            # states the backend emits. Everything else (SUCCEEDED, COMPLETED, FAILED,
            # CANCELLED, UNKNOWN-fallback) is terminal.
            case "$FINAL_STATUS" in
              ENQUEUED|PROCESSING|OPTIMIZATION_IN_PROGRESS)
                sleep "$POLL_INTERVAL_SECONDS"
                ;;
              *)
                break
                ;;
            esac
          done

          echo "🎉 Execution finished with status: $FINAL_STATUS"
          echo "status=$FINAL_STATUS" >> $GITHUB_OUTPUT

          echo "📋 Fetching detailed results..."
          set +e
          curl -sS --fail-with-body --retry 3 --retry-delay 5 \
            "${TESTOPS_BASE_URL}/rest/api/testops/execution/${EXECUTION_ID}/detailed-results" \
            -o results/execution-result.json
          CURL_EXIT=$?
          set -e

          if [ $CURL_EXIT -ne 0 ]; then
            BODY=$(cat results/execution-result.json 2>/dev/null || echo "")
            REASON=$(sanitize "Execution finished with status $FINAL_STATUS but fetching detailed results failed (curl exit $CURL_EXIT): $BODY")
            echo "::error::$REASON"
            echo "error_reason=$REASON" >> $GITHUB_OUTPUT
            exit 1
          fi

          if ! FAILED_SCRIPTS=$(jq -r '.summary.failedScripts // 0' results/execution-result.json 2>&1) || ! [[ "$FAILED_SCRIPTS" =~ ^[0-9]+$ ]]; then
            REASON=$(sanitize "Detailed results were downloaded but are not valid/expected JSON: $(cat results/execution-result.json 2>/dev/null)")
            echo "::error::$REASON"
            echo "error_reason=$REASON" >> $GITHUB_OUTPUT
            exit 1
          fi

          echo "results_path=results/execution-result.json" >> $GITHUB_OUTPUT

          if [ "$FINAL_STATUS" = "FAILED" ] || [ "$FAILED_SCRIPTS" -gt 0 ]; then
            echo "::warning::TestBot run finished with failures ($FAILED_SCRIPTS failed script(s))."
          fi

      - name: Show Results Summary
        if: always()
        run: |
          echo "Execution ID: ${{ steps.testbot.outputs.execution_id }}"
          echo "Status: ${{ steps.testbot.outputs.status }}"
          echo "Results: ${{ steps.testbot.outputs.results_path }}"

      - name: Display Raw Result JSON
        if: always() && steps.testbot.outputs.results_path != ''
        run: |
          cat "${{ steps.testbot.outputs.results_path }}" | jq .

      - name: Generate JUnit XML + Markdown Report
        id: report
        if: always() && steps.testbot.outputs.results_path != ''
        run: |
          set +e
          REPORT_OUTPUT=$(python3 <<'PY' 2>&1
          import json
          import xml.etree.ElementTree as ET
          from pathlib import Path

          json_file = Path("${{ steps.testbot.outputs.results_path }}")

          with open(json_file, "r", encoding="utf-8") as f:
              data = json.load(f)

          Path("results").mkdir(exist_ok=True)

          summary = data["summary"]

          suite = ET.Element(
              "testsuite",
              name=data.get("testBotName", "TestBot"),
              tests=str(summary.get("totalScripts", 0)),
              failures=str(summary.get("failedScripts", 0)),
              errors="0"
          )

          for ts in data.get("testSuiteResults", []):
              suite_name = ts.get("testSuiteName", "Suite")
              for script in ts.get("testScriptResults", []):
                  tc = ET.SubElement(
                      suite, "testcase",
                      classname=suite_name,
                      name=script.get("testScriptName", "Test")
                  )
                  if script.get("resultStatus") != "PASSED":
                      fail = ET.SubElement(tc, "failure")
                      fail.text = script.get("resultStatus")

          ET.ElementTree(suite).write(
              "results/junit-results.xml",
              encoding="utf-8",
              xml_declaration=True
          )

          md = []
          md.append("# TestBot Execution Report")
          md.append("")
          md.append(f"**Execution ID:** {data.get('executionId')}")
          md.append("")
          md.append(f"**Bot:** {data.get('testBotName')}")
          md.append("")
          md.append(f"**Status:** {data.get('status')}")
          md.append("")
          md.append(f"**Duration:** {summary.get('formattedDuration')}")
          md.append("")
          md.append("## Summary")
          md.append("")
          md.append("| Metric | Value |")
          md.append("|----------|----------|")
          md.append(f"| Total Suites | {summary.get('totalSuites')} |")
          md.append(f"| Passed Suites | {summary.get('passedSuites')} |")
          md.append(f"| Failed Suites | {summary.get('failedSuites')} |")
          md.append(f"| Total Scripts | {summary.get('totalScripts')} |")
          md.append(f"| Passed Scripts | {summary.get('passedScripts')} |")
          md.append(f"| Failed Scripts | {summary.get('failedScripts')} |")

          for suite in data.get("testSuiteResults", []):
              md.append("")
              md.append(f"## Suite: {suite['testSuiteName']}")
              md.append("")
              for script in suite.get("testScriptResults", []):
                  icon = "✅" if script["resultStatus"] == "PASSED" else "❌"
                  md.append(f"### {icon} {script['testScriptName']}")
                  for iteration in script.get("iterations", []):
                      md.append("")
                      md.append("| Step | Status | Description |")
                      md.append("|------|--------|-------------|")
                      for step in iteration.get("stepResults", []):
                          status = step["resultStatus"]
                          emoji = "✅" if status == "PASSED" else "❌"
                          md.append(f"| {step['sequence']} | {emoji} {status} | {step['testStepName']} |")

          Path("results/report.md").write_text("\n".join(md), encoding="utf-8")
          print("Generated:")
          print(" - results/junit-results.xml")
          print(" - results/report.md")
          PY
          )
          REPORT_EXIT=$?
          set -e

          echo "$REPORT_OUTPUT"

          if [ $REPORT_EXIT -ne 0 ]; then
            REASON=$(echo "$REPORT_OUTPUT" | tail -c 500 | tr '\n\r' '  ' | sed 's/|/\\|/g')
            echo "::error::Report generation failed: $REASON"
            echo "error_reason=Report generation failed: $REASON" >> $GITHUB_OUTPUT
            exit 1
          fi

      - name: Publish GitHub Job Summary
        if: always()
        env:
          EXECUTION_ID: ${{ steps.testbot.outputs.execution_id }}
          FINAL_STATUS: ${{ steps.testbot.outputs.status }}
          CONFIG_ERROR_REASON: ${{ steps.config.outputs.error_reason }}
          TESTBOT_ERROR_REASON: ${{ steps.testbot.outputs.error_reason }}
          REPORT_ERROR_REASON: ${{ steps.report.outputs.error_reason }}
        run: |
          # Reads reasons via env vars (not inlined into the script text) since these can
          # contain raw API error bodies — untrusted content that must never be interpolated
          # directly into a run: block.
          REASON="${CONFIG_ERROR_REASON}${TESTBOT_ERROR_REASON}${REPORT_ERROR_REASON}"

          {
            echo "## TestBot Run Status"
            echo ""
            echo "| Field | Value |"
            echo "|-------|-------|"
            echo "| Execution ID | ${EXECUTION_ID:-N/A} |"
            echo "| Status | ${FINAL_STATUS:-DID NOT COMPLETE} |"
          } >> "$GITHUB_STEP_SUMMARY"

          if [ -n "$REASON" ]; then
            echo "| Reason | $REASON |" >> "$GITHUB_STEP_SUMMARY"
          fi
          echo "" >> "$GITHUB_STEP_SUMMARY"

          if [ -f results/report.md ]; then
            cat results/report.md >> "$GITHUB_STEP_SUMMARY"
          elif [ -z "$REASON" ]; then
            echo "No report was generated. Check the 'Trigger and Poll TestBot Execution' step logs." >> "$GITHUB_STEP_SUMMARY"
          fi

      - name: Verify Generated Files
        if: always()
        run: |
          echo "===== GENERATED FILES ====="
          find results -type f 2>/dev/null || echo "No results directory was created."

      - name: Publish Test Results
        if: ${{ !cancelled() && steps.testbot.outputs.results_path != '' }}
        uses: EnricoMi/publish-unit-test-result-action@v2
        with:
          check_name: TestBot Results
          comment_title: TestBot Results
          files: results/junit-results.xml
          fail_on: test failures

      - name: Upload Reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: testbot-results-${{ github.run_number }}
          path: |
            results/*.xml
            results/*.json
            results/*.md
          if-no-files-found: warn
```

#### Step 3: Add Your TestBot Configuration

This workflow reads its configuration from `configs/testbot-config.json` in your repository (not from workflow inputs). Add that file — see [Step 1 above](#step-1-configure-testbot) for the required fields (`testBotId`, `name`, `executionConfiguration`, etc.).

#### Step 4: Know Your Env Vars and Outputs

**Key env vars** (top of the workflow file):

| Env Var | Default | Description |
| --- | --- | --- |
| `TESTOPS_BASE_URL` | AutomationHQ executor API | Endpoint the workflow polls |
| `POLL_INTERVAL_SECONDS` | `5` | How often it checks execution status |
| `POLL_TIMEOUT_MINUTES` | `345` | How long it polls before giving up |

**Timeout settings** (set right at GitHub's per-job cap for `ubuntu-latest`):

| Setting | Default | Where |
| --- | --- | --- |
| `POLL_TIMEOUT_MINUTES` | `345` | `env:` block |
| Job `timeout-minutes` | `358` | `jobs.run-testbot` |
| Step `timeout-minutes` | `350` | "Trigger and Poll TestBot Execution" step |

**Outputs of the `testbot` step** (used by later steps and available to your own):

| Output | Description |
| --- | --- |
| `execution_id` | TestBot execution identifier |
| `status` | Final execution status (`SUCCEEDED` / `COMPLETED` / `FAILED` / `CANCELLED`) |
| `results_path` | Path to the saved detailed results JSON file |

#### Step 5: Run It

Trigger the workflow manually (`workflow_dispatch`) from the **Actions** tab of your repository.

---

### Option B: Copy the Workflow Directly From This Repo

Instead of going through the Marketplace listing, you can copy `.github/workflows/testbot-ci.yml` from this repository as-is — it's the exact same file shown in Option A above. See the sections above in this README for the full walkthrough (`configs/testbot-config.json`, the `TESTBOT_JWT_TOKEN` secret, and the workflow's reporting steps).

---

### Option C: Install the Packaged Action from GitHub Marketplace (`uses:` step)

This is a separate, lighter-weight integration path from Options A/B above: instead of copying the full bash-based workflow, you add the pre-built action as a single `uses:` step in your own workflow — no workflow script to maintain. It's the same action published at:

**https://github.com/marketplace/actions/run-testbot**

> **Run TestBot**
> Run TestBot with JWT-based authentication for CI/CD pipelines

#### Step 1: Add the JWT Token Secret

Same secret as Option A/B — in your own repository:

```text
Settings → Secrets and Variables → Actions → New Repository Secret
```

| Secret Name | Description |
| --- | --- |
| `TESTBOT_JWT_TOKEN` | JWT authentication token for the TestBot API |

#### Step 2: Copy the Installation Snippet

Per the Marketplace listing's **Installation** section, paste this into your `.yml` file:

```yaml
- name: Run TestBot
  uses: testbots-ai/Run-Testbot@v1.0.1
```

> Learn more about this action in [testbots-ai/Run-Testbot](https://github.com/testbots-ai/Run-Testbot).

This snippet alone won't run as-is — `jwt_token` and `test_bot_configuration` are required inputs. You need to add a `with:` block (Step 3).

#### Step 3: Add the Required Inputs

```yaml
- name: Run TestBot
  id: testbot
  uses: testbots-ai/Run-Testbot@v1.0.1
  timeout-minutes: 350
  with:
    jwt_token: ${{ secrets.TESTBOT_JWT_TOKEN }}
    test_bot_configuration: ${{ steps.prepare-config.outputs.config }}
    poll_interval_seconds: '5'
    timeout_minutes: '345'
```

`test_bot_configuration` expects a stringified JSON blob — your `configs/testbot-config.json`. Step 4 shows how to produce it.

#### Step 4: Full Example Workflow

Save this as `.github/workflows/testbot.yml`:

```text
.
├── .github/
│   └── workflows/
│       └── testbot.yml
│
└── configs/
    └── testbot-config.json
```

```yaml
name: Run TestBot

on:
  workflow_dispatch:

jobs:
  run-testbot:
    runs-on: ubuntu-latest
    timeout-minutes: 358

    steps:
      - uses: actions/checkout@v4

      - name: Load Configuration
        id: prepare-config
        run: |
          CONFIG=$(cat configs/testbot-config.json)
          EOF=$(dd if=/dev/urandom bs=15 count=1 status=none | base64)
          echo "config<<$EOF" >> $GITHUB_OUTPUT
          echo "$CONFIG" >> $GITHUB_OUTPUT
          echo "$EOF" >> $GITHUB_OUTPUT

      - name: Run TestBot
        id: testbot
        uses: testbots-ai/Run-Testbot@v1.0.1
        timeout-minutes: 350
        with:
          jwt_token: ${{ secrets.TESTBOT_JWT_TOKEN }}
          test_bot_configuration: ${{ steps.prepare-config.outputs.config }}
          poll_interval_seconds: '5'
          timeout_minutes: '345'

      - name: Show Results
        if: always()
        run: |
          echo "Execution ID: ${{ steps.testbot.outputs.execution_id }}"
          echo "Status: ${{ steps.testbot.outputs.status }}"
          echo "Results Path: ${{ steps.testbot.outputs.results_path }}"

      - name: Publish Test Results
        if: always()
        uses: EnricoMi/publish-unit-test-result-action@v2
        with:
          files: results/junit.xml

      - name: Upload Reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: testbot-results-${{ github.run_number }}
          path: results/
```

This is intentionally pinned to `@v1.0.1`, not a floating tag — when a new version is published, bump this one line yourself (e.g. to `@v1.0.2`) to move to it; nothing else in the file changes.

> Unlike the vendored `testbot-ci.yml` workflow (Options A/B), the packaged action writes its JUnit report to a fixed path, `results/junit.xml`, and its raw results JSON to `results/execution-<executionId>.json` (the exact path is returned in the `results_path` output) — different filenames from the vendored workflow's `results/junit-results.xml` and `results/execution-result.json`. It also decodes the TestOps executor URL directly out of the `jwt_token` you pass in, so no `TESTOPS_BASE_URL` env var is needed.

#### Step 5: Inputs / Outputs Reference

**Inputs** (from `action.yml`):

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `jwt_token` | Yes | - | JWT token used for authentication |
| `test_bot_configuration` | Yes | - | Full TestBot configuration JSON (must include `testBotId`) |
| `poll_interval_seconds` | No | `5` | Polling interval while execution is running |
| `timeout_minutes` | No | `60` | Maximum wait time for execution completion |

**Outputs:**

| Output | Description |
| --- | --- |
| `execution_id` | TestBot execution identifier |
| `status` | Final execution status |
| `results_path` | Path to `results/execution-<executionId>.json` |

The action's built-in default, `timeout_minutes: 60`, is only enough for short runs. TestBot executions can legitimately take up to ~5h45m, which is why Steps 3 and 4 above already set `timeout_minutes: '345'` (matching Option A/B's `POLL_TIMEOUT_MINUTES: 345`) with the step's `timeout-minutes: 350` and the job's `timeout-minutes: 358` a few minutes above it — all still under GitHub's hard 360-minute cap for `ubuntu-latest`. If your own runs are shorter, you can safely lower all three.

#### Step 6: Run It

Trigger the workflow manually (`workflow_dispatch`) from the **Actions** tab of your repository.

---

### Where Results Show Up (All Options)

* **Job Summary** — execution ID, status, duration, suite/script counts (Options A/B only — Option C prints a plain-text summary to the step log instead)
* **GitHub Checks** — JUnit pass/fail results, visible on Pull Requests
* **Artifacts** — Options A/B: `execution-result.json`, `junit-results.xml`, `report.md`. Option C: `execution-<executionId>.json`, `junit.xml`.

---

### Troubleshooting

| Symptom | Check |
| --- | --- |
| Authentication failure | `TESTBOT_JWT_TOKEN` secret exists and is not expired |
| Invalid TestBot ID | `testBotId` in `configs/testbot-config.json` exists and is accessible |
| Workflow times out | Increase `POLL_TIMEOUT_MINUTES` (env var) and the job/step `timeout-minutes` — keep the step and job values a few minutes above `POLL_TIMEOUT_MINUTES`, and all three under GitHub's hard 360-minute cap for `ubuntu-latest` (use a self-hosted runner if you need longer) |

For further issues, contact your TestBots administrator or support team.

</details>

---

# Support

For issues related to:

* TestBot execution
* Authentication
* Configuration
* CI/CD integration

Contact your TestBots administrator or support team.