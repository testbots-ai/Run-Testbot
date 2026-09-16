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
  # write (not read) is required so the "Deploy Allure Report to GitHub
  # Pages" step below can push the generated report to the gh-pages branch.
  contents: write
  checks: write
  pull-requests: write

jobs:
  run-testbot:
    runs-on: ubuntu-latest
    timeout-minutes: 358

    steps:
      - uses: actions/checkout@v4

      # Pulls prior Allure report history (if any) from the gh-pages branch
      # so this run's report shows trends across runs, not just this one.
      # continue-on-error: the gh-pages branch won't exist yet on the very
      # first run, which would otherwise fail this step.
      - name: Get Allure History
        uses: actions/checkout@v4
        if: always()
        continue-on-error: true
        with:
          ref: gh-pages
          path: gh-pages

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

      # simple-elf/allure-report-action (below) only formats an existing
      # allure-results/ folder — it doesn't generate one. This step converts
      # the TestBot JSON results into Allure's own per-test result format
      # (one <uuid>-result.json file per test script) so there's real data
      # for it to render instead of an empty report.
      - name: Generate Allure Results
        if: always() && steps.testbot.outputs.results_path != ''
        run: |
          python3 <<'PY'
          import json
          import time
          import uuid
          from pathlib import Path

          json_file = Path("${{ steps.testbot.outputs.results_path }}")

          with open(json_file, "r", encoding="utf-8") as f:
              data = json.load(f)

          out_dir = Path("allure-results")
          out_dir.mkdir(exist_ok=True)

          now_ms = int(time.time() * 1000)

          def allure_status(result_status):
              return "passed" if result_status == "PASSED" else "failed"

          for ts in data.get("testSuiteResults", []):
              suite_name = ts.get("testSuiteName", "Suite")
              for script in ts.get("testScriptResults", []):
                  script_name = script.get("testScriptName", "Test")

                  steps = []
                  for iteration in script.get("iterations", []):
                      for step in iteration.get("stepResults", []):
                          steps.append({
                              "name": f"{step.get('sequence')}: {step.get('testStepName', 'Step')}",
                              "status": allure_status(step.get("resultStatus")),
                              "stage": "finished",
                              "start": now_ms,
                              "stop": now_ms,
                          })

                  result = {
                      "uuid": str(uuid.uuid4()),
                      "historyId": f"{suite_name}::{script_name}",
                      "name": script_name,
                      "status": allure_status(script.get("resultStatus")),
                      "stage": "finished",
                      "start": now_ms,
                      "stop": now_ms,
                      "labels": [
                          {"name": "suite", "value": suite_name},
                          {"name": "framework", "value": "AutomationHQ TestBot"},
                      ],
                      "steps": steps,
                  }

                  result_file = out_dir / f"{result['uuid']}-result.json"
                  result_file.write_text(json.dumps(result), encoding="utf-8")

          print(f"Generated Allure results in {out_dir}")
          PY

      # Generate Allure Report via Action
      - name: Generate Allure Report
        uses: simple-elf/allure-report-action@v1.15
        if: always()
        with:
          allure_results: allure-results
          allure_history: allure-history

      # Publishes allure-history (this run's report + prior history) to the
      # gh-pages branch, which is what actually gives the report a URL.
      # Requires GitHub Pages enabled on this repo: Settings → Pages →
      # Source: "Deploy from a branch" → Branch: gh-pages / (root).
      - name: Deploy Allure Report to GitHub Pages
        if: always()
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: allure-history
          keep_files: true

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

---

## 4. Enable GitHub Pages (for the Allure Report)

One-time setup, needed for the Allure Report step to produce a real, browsable report URL:

```text
Repo → Settings → Pages → Source: "Deploy from a branch" → Branch: gh-pages / (root) → Save
```

The `gh-pages` branch doesn't need to exist yet — the workflow's **Deploy Allure Report to GitHub Pages** step creates and pushes to it automatically on the first run.

**Where to see the report:** after a run completes, open:

```text
https://<your-github-username-or-org>.github.io/<your-repo-name>/
```

It may take a minute or two after the first run for Pages to finish publishing. Every subsequent run updates this same URL in place, and keeps up to the last 20 runs' history (via `keep_reports: 20`, the action's default) so you can see pass/fail trends over time, not just the latest run.

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
