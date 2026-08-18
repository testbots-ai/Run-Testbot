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
  uses: testbots-ai/Run-Testbot@v1.0.0
```

> Learn more about this action in [testbots-ai/Run-Testbot](https://github.com/testbots-ai/Run-Testbot).

This snippet alone won't run as-is — `jwt_token` and `test_bot_configuration` are required inputs (see [Action Inputs](#action-inputs) below), so you need to add a `with:` block.

## Step 3: Add the Required Inputs

```yaml
- name: Run TestBot
  id: testbot
  uses: testbots-ai/Run-Testbot@v1.0.0
  timeout-minutes: 350
  with:
    jwt_token: ${{ secrets.TESTBOT_JWT_TOKEN }}
    test_bot_configuration: ${{ steps.prepare-config.outputs.config }}
    poll_interval_seconds: '5'
    timeout_minutes: '345'
```

`test_bot_configuration` expects a stringified JSON blob (your `configs/testbot-config.json`, optionally with `testBotId` overridden) — see Step 4 for how to produce it.

## Step 4: Full Example Workflow

```yaml
name: Run Test Bot (Marketplace Action)

on:
  workflow_dispatch:
    inputs:
      test_bot_id:
        description: 'Override testBotId'
        required: false
        default: ''

jobs:
  run-testbot:
    runs-on: ubuntu-latest
    # Test runs can legitimately take up to ~5h45m. Kept a few minutes above the
    # step's own timeout-minutes/timeout_minutes, and under GitHub's hard,
    # non-configurable 360-minute (6h) per-job cap for ubuntu-latest runners — a
    # self-hosted runner (no such cap) is required if you need longer.
    timeout-minutes: 358

    steps:
      - uses: actions/checkout@v4

      - name: Prepare Configuration
        id: prepare-config
        run: |
          CONFIG=$(cat configs/testbot-config.json)

          OVERRIDE_ID="${{ github.event.inputs.test_bot_id }}"
          if [ -n "$OVERRIDE_ID" ]; then
            CONFIG=$(echo "$CONFIG" | jq --arg id "$OVERRIDE_ID" '.testBotId = $id')
          fi

          EOF=$(dd if=/dev/urandom bs=15 count=1 status=none | base64)
          echo "config<<$EOF" >> $GITHUB_OUTPUT
          echo "$CONFIG" >> $GITHUB_OUTPUT
          echo "$EOF" >> $GITHUB_OUTPUT

      - name: Run TestBot
        id: testbot
        uses: testbots-ai/Run-Testbot@v1.0.0
        # A few minutes above the timeout_minutes input (not equal to it), so GitHub's
        # own step timeout never races the action's internal polling timeout.
        timeout-minutes: 350
        with:
          jwt_token: ${{ secrets.TESTBOT_JWT_TOKEN }}
          test_bot_configuration: ${{ steps.prepare-config.outputs.config }}
          poll_interval_seconds: '5'
          timeout_minutes: '345'

      - name: Show Results
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
          name: testbot-results
          path: results/
```

> Unlike the vendored `testbot-ci.yml` workflow, the packaged action writes its JUnit report to a fixed path, `results/junit.xml`, and its raw results JSON to `results/execution-<executionId>.json` (the exact path is returned in the `results_path` output) — different filenames than the vendored workflow's `results/junit-results.xml` and `results/execution-result.json`. It also reads the TestOps executor URL directly out of the `jwt_token` you pass in, so no `TESTOPS_BASE_URL` env var is needed.

## Step 5: Run It

Trigger the workflow manually (`workflow_dispatch`) from the **Actions** tab of your repository, optionally overriding `test_bot_id`. See [Action Inputs](#action-inputs) and [Action Outputs](#action-outputs) below for the full reference.

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
  uses: testbots-ai/Run-Testbot@v1.0.0
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

# Support

For issues related to:

* TestBot execution
* Authentication
* Configuration
* CI/CD integration

Contact your TestBots administrator or support team.