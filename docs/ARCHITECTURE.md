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
- `server/index.mjs` reads OpenClaw state and returns `/api/overview`.
- `scripts/smoke-overview.mjs` checks the adapter contract.
- `scripts/smoke-ui.mjs` checks desktop/mobile rendering and the review drawer.

## Important Boundaries

- The browser should receive normalized cockpit data, not raw OpenClaw output.
- Command previews are drafts, not execution requests.
- Future execution must use a server-side command catalog.
- OpenClaw CLI output should be treated as a changing source, not a permanent API.

## Planned Split

The adapter should be split into:

- `openclawSources`: CLI, gateway, config, and job reads
- `openclawParsers`: text and JSON parsing
- `overviewNormalizer`: beginner-facing output
- `compatibilityScoring`: drift and safety checks
- `commandCatalog`: capability-backed command drafts

That split keeps OpenClaw churn away from the UI.
