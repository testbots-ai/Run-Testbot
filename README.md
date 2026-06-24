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

Example:

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

Create the following workflow:

```yaml
name: Run Test Bot CI/CD

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
        uses: ./
        with:
          jwt_token: ${{ secrets.TESTBOT_JWT_TOKEN }}
          test_bot_configuration: ${{ steps.prepare-config.outputs.config }}
          poll_interval_seconds: '5'
          timeout_minutes: '60'

      - name: Generate Reports
        run: |
          # Generates:
          # - JUnit XML
          # - Markdown Report
          # - GitHub Summary

      - name: Publish Results
        uses: EnricoMi/publish-unit-test-result-action@v2
        with:
          files: results/junit-results.xml

      - name: Upload Reports
        uses: actions/upload-artifact@v4
        with:
          name: testbot-results
          path: results/
```

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

| Input                    | Required | Default | Description                                 |
| ------------------------ | -------- | ------- | ------------------------------------------- |
| `jwt_token`              | Yes      | -       | JWT token used for authentication           |
| `test_bot_configuration` | Yes      | -       | Full TestBot configuration JSON             |
| `poll_interval_seconds`  | No       | 5       | Polling interval while execution is running |
| `timeout_minutes`        | No       | 60      | Maximum wait time for execution completion  |

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

Increase:

```yaml
with:
  timeout_minutes: '120'
```

Or reduce execution time inside the TestBot.

---

# Support

For issues related to:

* TestBot execution
* Authentication
* Configuration
* CI/CD integration

Contact your TestBots administrator or support team.