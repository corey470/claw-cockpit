# Architecture

Claw Cockpit is a local web app with a small adapter between the browser and OpenClaw.

```text
Browser UI
  -> Claw Cockpit adapter
    -> OpenClaw CLI
    -> OpenClaw gateway probe
    -> local OpenClaw state files
```

## Current Shape

- `src/App.tsx` renders the task cockpit.
- `server/index.mjs` exposes `/api/overview` and `/api/health`.
- `server/openclawSources.mjs` reads live OpenClaw or fixture sources.
- `server/openclawParsers.mjs` turns CLI/config text into smaller facts.
- `server/compatibilityScoring.mjs` scores drift, security, and command-surface risk.
- `server/overviewNormalizer.mjs` returns the browser-safe overview contract.
- `scripts/smoke-overview.mjs` checks the adapter contract.
- `scripts/smoke-ui.mjs` checks desktop/mobile rendering and the review drawer.
- `scripts/ci-smoke.mjs` starts fixture-backed adapter and Vite servers for GitHub Actions.

## Important Boundaries

- The browser should receive normalized cockpit data, not raw OpenClaw output.
- Command previews are drafts, not execution requests.
- Future execution must use a server-side command catalog.
- OpenClaw CLI output should be treated as a changing source, not a permanent API.

## Adapter Split

The adapter is split into:

- `openclawSources`: CLI, gateway, config, and job reads
- `openclawParsers`: text and JSON parsing
- `overviewNormalizer`: beginner-facing output
- `compatibilityScoring`: drift and safety checks
- future `commandCatalog`: capability-backed command drafts

That split keeps OpenClaw churn away from the UI.

## Fixture Mode

Set `COCKPIT_FIXTURE_DIR=fixtures/openclaw-current` to run the adapter without a live OpenClaw install. This is what GitHub Actions uses.
