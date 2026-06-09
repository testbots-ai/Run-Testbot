<p align="center">
  <img src="./assets/testbots-logo.png" width="250" />
</p>

# Run Testbot

Run Testbot directly from your GitHub Actions workflows using JWT authentication.

This GitHub Action allows teams to execute Testbot as part of their CI/CD pipeline, monitor execution status, and automatically collect detailed execution results.

---

## Features

* Execute Testbot from GitHub Actions
* JWT-based authentication
* Configurable execution settings
* Automatic polling until execution completes
* Configurable timeout handling
* Save execution results as workflow artifacts
* Supports environment-specific configurations
* Works with CI/CD pipelines and manual workflow dispatches

---

## Requirements

Before using this action, ensure you have:

* A valid Testbot ID
* A JWT authentication token
* A testbot configuration JSON

---

## Installation

Reference this action in your workflow:

```yaml
uses: your-org/testbot-action@v1
```

or use a specific version:

```yaml
uses: your-org/testbot-action@1.0.0
```

---

## Inputs

| Name                     | Description                                                           | Required | Default |
| ------------------------ | --------------------------------------------------------------------- | -------- | ------- |
| `jwt_token`              | JWT token used for authentication                                     | Yes      | -       |
| `test_bot_configuration` | Stringified JSON configuration containing test bot execution settings | Yes      | -       |
| `poll_interval_seconds`  | Polling interval in seconds while waiting for execution completion    | No       | `5`     |
| `timeout_minutes`        | Maximum execution wait time                                           | No       | `60`    |

---

## Outputs

| Name           | Description                              |
| -------------- | ---------------------------------------- |
| `execution_id` | Execution ID returned                    |
| `status`       | Final execution status                   |
| `results_path` | Path to generated execution results file |

---

## Basic Usage

```yaml
name: Run Test Bot

on:
  workflow_dispatch:

jobs:
  run-testbot:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run Test Bot
        id: testbot
        uses: your-org/testbot-action@v1
        with:
          jwt_token: ${{ secrets.TESTBOT_JWT_TOKEN }}
          test_bot_configuration: |
            {
              "testBotId": "f1da9b63-4103-42ed-9d7d-e3371d67f7b5"
            }

      - name: Show Results
        run: |
          echo "Execution ID: ${{ steps.testbot.outputs.execution_id }}"
          echo "Status: ${{ steps.testbot.outputs.status }}"
```

---

## Recommended Repository Structure

```text
.
├── .github
│   └── workflows
│       └── testbot-ci.yml
├── configs
│   └── testbot-config.json
├── src
├── dist
├── action.yml
├── package.json
└── README.md
```

---

## Configuration File Example

Create a configuration file:

`configs/testbot-config.json`

```json
{
  "name": "AHQ Premium Grid - DEV - Web - WIN11 - Chrome",
  "testBotId": "f1da9b63-4103-42ed-9d7d-e3371d67f7b5",
  "executionConfiguration": {
    "browser": "Chrome",
    "browserVersion": "latest",
    "osType": "WIN11",
    "resolution": "1920x1200",
    "timeout": 30
  }
}
```

---

## Complete Workflow Example

```yaml
name: Run Test Bot CI/CD

on:
  workflow_dispatch:
    inputs:
      test_bot_id:
        description: Override testBotId
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

      - name: Run Test Bot
        id: testbot
        uses: your-org/testbot-action@v1
        with:
          jwt_token: ${{ secrets.TESTBOT_JWT_TOKEN }}
          test_bot_configuration: ${{ steps.prepare-config.outputs.config }}
          poll_interval_seconds: "5"
          timeout_minutes: "60"

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: testbot-results
          path: results/

      - name: Summary
        if: always()
        run: |
          echo "Execution ID : ${{ steps.testbot.outputs.execution_id }}"
          echo "Status       : ${{ steps.testbot.outputs.status }}"
          echo "Results Path : ${{ steps.testbot.outputs.results_path }}"
```

---

## Using GitHub Secrets

Store your JWT token securely:

1. Open your repository.

2. Navigate to:

   ```
   Settings → Secrets and variables → Actions
   ```

3. Create a new repository secret:

   ```
   TESTBOT_JWT_TOKEN
   ```

4. Reference it inside your workflow:

```yaml
jwt_token: ${{ secrets.TESTBOT_JWT_TOKEN }}
```

---

## Execution Flow

```text
GitHub Workflow
       │
       ▼
Run Test Bot Action
       │
       ▼
Authenticate using JWT
       │
       ▼
Start Test Bot Execution
       │
       ▼
Poll Execution Status
       │
       ▼
Execution Complete
       │
       ▼
Download Results
       │
       ▼
Expose Outputs & Save Artifacts
```

---

## Status Values

The action may return the following statuses:

| Status  | Meaning                                                |
| ------- | ------------------------------------------------------ |
| PASSED  | Test execution completed successfully                  |
| FAILED  | One or more test cases failed                          |
| ERROR   | Execution failed due to system or configuration issues |
| TIMEOUT | Execution exceeded configured timeout                  |

---

## Best Practices

### Store Secrets Securely

Never hardcode:

* JWT tokens
* Passwords
* API keys

Use GitHub Secrets instead.

### Keep Configuration Files Versioned

Store execution settings in:

```text
configs/testbot-config.json
```

This makes environment-specific updates easier.

### Upload Results

Always upload results as artifacts:

```yaml
if: always()
```

This ensures results are available even when executions fail.

---

## Troubleshooting

### Invalid JWT Token

Verify:

* Token has not expired
* Token is stored correctly in GitHub Secrets
* Secret name matches workflow configuration

### Test Bot Not Found

Verify:

* `testBotId` exists
* JWT token has access to the target workspace
* Configuration file contains valid JSON

### Timeout Errors

Increase:

```yaml
timeout_minutes: "120"
```

for longer-running executions.

### Invalid Configuration

Validate your JSON locally before committing:

```bash
cat configs/testbot-config.json | jq .
```

---

## Security Notes

* Store authentication tokens only in GitHub Secrets.
* Do not commit credentials to source control.
* Restrict access to production execution configurations.
* Use environment-specific secrets whenever possible.

---

## Support

For support, bug reports, or feature requests:

* Open a GitHub Issue
* Contact your administrator
* Refer to your organization's documentation

---

## License

MIT License

Copyright (c) TestBots
