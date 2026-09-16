<p align="center">
  <img src="./assets/testbots-logo.png" width="100" />
</p>

# TestBot GitHub Action

Run TestBots directly from GitHub Actions and publish execution results inside your GitHub workflow.

Get it from the GitHub Marketplace: **https://github.com/marketplace/actions/run-testbot**

---

## Folder Structure

Add these two files to your repository:

```text
.
├── .github/
│   └── workflows/
│       └── testbot.yml
│
└── configs/
    └── testbot-config.json
```

---

## 1. Add Your TestBot Configuration

Create `configs/testbot-config.json` with your test bot's configuration JSON:

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

## 2. Add Your JWT Token

`Settings → Secrets and Variables → Actions → New Repository Secret`

| Secret Name | Description |
| --- | --- |
| `TESTBOT_JWT_TOKEN` | JWT authentication token for the TestBot API |

## 3. Add the Workflow

Create `.github/workflows/testbot.yml`:

```yaml
name: Run TestBot

on:
  workflow_dispatch:

permissions:
  contents: read
  checks: write
  pull-requests: write

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
        uses: testbots-ai/Run-Testbot@v1.0.2
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

      - name: Generate Markdown Report
        id: report
        if: always() && steps.testbot.outputs.results_path != ''
        run: |
          set +e
          REPORT_OUTPUT=$(python3 <<'PY' 2>&1
          import json
          from pathlib import Path

          json_file = Path("${{ steps.testbot.outputs.results_path }}")

          with open(json_file, "r", encoding="utf-8") as f:
              data = json.load(f)

          Path("results").mkdir(exist_ok=True)

          summary = data.get("summary", {})

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
              md.append(f"## Suite: {suite.get('testSuiteName', 'Suite')}")
              md.append("")
              for script in suite.get("testScriptResults", []):
                  icon = "✅" if script.get("resultStatus") == "PASSED" else "❌"
                  md.append(f"### {icon} {script.get('testScriptName', 'Test')}")
                  for iteration in script.get("iterations", []):
                      md.append("")
                      md.append("| Step | Status | Description |")
                      md.append("|------|--------|-------------|")
                      for step in iteration.get("stepResults", []):
                          status = step.get("resultStatus")
                          emoji = "✅" if status == "PASSED" else "❌"
                          md.append(f"| {step.get('sequence')} | {emoji} {status} | {step.get('testStepName')} |")

          Path("results/report.md").write_text("\n".join(md), encoding="utf-8")
          print("Generated: results/report.md")
          PY
          )
          REPORT_EXIT=$?
          set -e

          echo "$REPORT_OUTPUT"

          if [ $REPORT_EXIT -ne 0 ]; then
            echo "::warning::Report generation failed: $(echo "$REPORT_OUTPUT" | tail -c 500 | tr '\n\r' '  ')"
          fi

      # Generate Allure Report via Action
      - name: Generate Allure Report
        uses: simple-elf/allure-report-action@v2
        if: always()
        with:
          allure_results: allure-results
          allure_history: allure-history

      - name: Publish GitHub Job Summary
        if: always()
        env:
          EXECUTION_ID: ${{ steps.testbot.outputs.execution_id }}
          FINAL_STATUS: ${{ steps.testbot.outputs.status }}
        run: |
          {
            echo "## TestBot Run Status"
            echo ""
            echo "| Field | Value |"
            echo "|-------|-------|"
            echo "| Execution ID | ${EXECUTION_ID:-N/A} |"
            echo "| Status | ${FINAL_STATUS:-DID NOT COMPLETE} |"
          } >> "$GITHUB_STEP_SUMMARY"
          echo "" >> "$GITHUB_STEP_SUMMARY"

          if [ -f results/report.md ]; then
            cat results/report.md >> "$GITHUB_STEP_SUMMARY"
          fi

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

Trigger it from the **Actions** tab → **Run TestBot** → **Run workflow**.

> **Note on the Allure Report step:** this step expects Allure's own result format in an `allure-results/` folder. This workflow doesn't generate that format — it produces `results/junit.xml` and `results/report.md` instead. Until a step is added that converts those into `allure-results/`, this step has nothing to process.

---

## Timeouts Used in This Workflow

| Timeout | Value | What it controls |
| --- | --- | --- |
| `timeout_minutes` (input) | 345 min | How long the action itself polls the TestBot before giving up |
| `timeout-minutes` on the **Run TestBot** step | 350 min | GitHub's own limit for that step — kept a few minutes above `timeout_minutes` |
| `timeout-minutes` on the **job** | 358 min | Overall limit for the whole job — kept a few minutes above the step timeout |

These are set right under GitHub's hard 360-minute (6h) cap for `ubuntu-latest` runners, since TestBot runs can take up to ~5h45m. If your tests are shorter, you can lower all three.

---

## Keeping Up to Date

This line pins the workflow to a specific version:

```yaml
uses: testbots-ai/Run-Testbot@v1.0.2
```

Whenever a new version is released, that's the **only line you need to change** — bump `v1.0.2` to the new version (e.g. `v1.0.3`). Nothing else in the file changes.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Authentication failure | Confirm `TESTBOT_JWT_TOKEN` exists in repo secrets and hasn't expired |
| Invalid TestBot ID | Confirm `testBotId` in `configs/testbot-config.json` exists and is accessible |
| `403 Forbidden` / `Resource not accessible by integration` | Make sure the `permissions:` block (`contents: read`, `checks: write`, `pull-requests: write`) is present near the top of the workflow |
| Workflow times out | Raise `timeout_minutes`, the step's `timeout-minutes`, and the job's `timeout-minutes` together — keep all three under GitHub's 360-minute cap for `ubuntu-latest` |
