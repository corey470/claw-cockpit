# Architecture

Claw Cockpit is a local web app with a small adapter between the browser and OpenClaw.

```text
Browser UI
  -> Claw Cockpit adapter
    -> OpenClaw CLI
    -> OpenClaw gateway probe
    -> local OpenClaw state files
    -> local skill folders
```

## Current Shape

- `src/App.tsx` renders the task cockpit.
- `server/index.mjs` exposes `/api/overview`, `/api/skills`, `/api/commands/*`, and `/api/health`.
- `server/openclawSources.mjs` reads live OpenClaw or fixture sources.
- `server/openclawParsers.mjs` turns CLI/config text into smaller facts.
- `server/compatibilityScoring.mjs` scores drift, security, and command-surface risk.
- `server/overviewNormalizer.mjs` returns the browser-safe overview contract.
- `server/commandCatalog.mjs` owns runnable command IDs, validation, dry-run mode, execution, and audit logs.
- `server/skillWorkshop.mjs` reads local skills and drafts review-only `SKILL.md` files.
- `scripts/smoke-overview.mjs` checks the adapter contract.
- `scripts/smoke-ui.mjs` checks desktop/mobile rendering and the review drawer.
- `scripts/smoke-commands.mjs` checks catalog preview/run behavior without changing live state.
- `scripts/smoke-skills.mjs` checks skill inventory and draft generation.
- `scripts/ci-smoke.mjs` starts fixture-backed adapter and Vite servers for GitHub Actions.

## Important Boundaries

- The browser should receive normalized cockpit data, not raw OpenClaw output.
- Command previews become execution requests only when they carry a supported server-side command ID.
- Execution uses `execFile`, validated arguments, local origin checks, explicit confirmation, and audit logging.
- Skill drafts are file previews only until install/package commands are explicitly allowlisted.
- OpenClaw CLI output should be treated as a changing source, not a permanent API.

## Adapter Split

The adapter is split into:

- `openclawSources`: CLI, gateway, config, and job reads
- `openclawParsers`: text and JSON parsing
- `overviewNormalizer`: beginner-facing output
- `compatibilityScoring`: drift and safety checks
- `commandCatalog`: capability-backed command drafts and safe execution
- `skillWorkshop`: local skill inventory and review-only draft generation

That split keeps OpenClaw churn away from the UI.

## Fixture Mode

Set `COCKPIT_FIXTURE_DIR=fixtures/openclaw-current` to run the adapter without a live OpenClaw install. This is what GitHub Actions uses.

Fixture mode also reads `fixtures/openclaw-current/skills` so skill inventory and Skill Workshop smoke tests work without a local `~/.codex/skills` folder.
