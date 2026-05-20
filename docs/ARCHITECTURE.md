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
- `server/index.mjs` exposes `/api/overview`, `/api/skills`, `/api/workspaces`, `/api/commands/*`, and `/api/health`.
- `server/openclawSources.mjs` reads live OpenClaw or fixture sources.
- `server/openclawParsers.mjs` turns CLI/config text into smaller facts.
- `server/compatibilityScoring.mjs` scores drift, security, and command-surface risk.
- `server/overviewNormalizer.mjs` returns the browser-safe overview contract.
- `server/commandCatalog.mjs` owns runnable command IDs, validation, dry-run mode, execution, and audit logs.
- `server/skillWorkshop.mjs` reads local skills, drafts `SKILL.md` previews, saves reviewed drafts under the Cockpit draft folder, installs saved drafts, and writes reviewed plugin packs.
- `server/workspaces.mjs` suggests local project folders for helper setup without letting the browser provide commands.
- `scripts/smoke-overview.mjs` checks the adapter contract.
- `scripts/smoke-ui.mjs` checks desktop/mobile rendering and the review drawer.
- `scripts/smoke-commands.mjs` checks catalog preview/run behavior, including warning fix IDs, without changing live state.
- `scripts/smoke-skills.mjs` checks skill inventory, draft generation, plugin-pack writing, and saved-draft install behavior.
- `scripts/smoke-workspaces.mjs` checks workspace suggestions return usable absolute paths.
- `scripts/ci-smoke.mjs` starts fixture-backed adapter and Vite servers for GitHub Actions.

## Important Boundaries

- The browser should receive normalized cockpit data, not raw OpenClaw output.
- Command previews become execution requests only when they carry a supported server-side command ID.
- Execution uses `execFile`, validated arguments, local origin checks, explicit confirmation, and audit logging.
- Skill drafts can be saved only under `~/.openclaw/claw-cockpit/skill-drafts/`.
- Skill install can only copy a saved draft to `~/.codex/skills` or `COCKPIT_INSTALL_SKILL_DIR`, requires explicit confirmation, and refuses conflicting existing files.
- Plugin pack creation writes only reviewed package files under the Cockpit plugin-pack folder or `COCKPIT_PLUGIN_PACK_DIR`; conflicting existing files are refused.
- Warning fixes become runnable only after they get a command catalog ID. Gateway restart and deep security audit are allowlisted.
- OpenClaw CLI output should be treated as a changing source, not a permanent API.

## Adapter Split

The adapter is split into:

- `openclawSources`: CLI, gateway, config, and job reads
- `openclawParsers`: text and JSON parsing
- `overviewNormalizer`: beginner-facing output
- `compatibilityScoring`: drift and safety checks
- `commandCatalog`: capability-backed command drafts and safe execution
- `skillWorkshop`: local skill inventory, draft generation, safe draft persistence, saved-draft install, and plugin-pack writing
- `workspaces`: local folder discovery for beginner-friendly helper setup

That split keeps OpenClaw churn away from the UI.

## Fixture Mode

Set `COCKPIT_FIXTURE_DIR=fixtures/openclaw-current` to run the adapter without a live OpenClaw install. This is what GitHub Actions uses.

Fixture mode also reads `fixtures/openclaw-current/skills` so skill inventory and Skill Workshop smoke tests work without a local `~/.codex/skills` folder. CI points `OPENCLAW_HOME` at `.tmp/openclaw-smoke`, `COCKPIT_INSTALL_SKILL_DIR` at `.tmp/installed-skills`, and `COCKPIT_PLUGIN_PACK_DIR` at `.tmp/plugin-packs` so write smoke tests never touch real OpenClaw or Codex folders.
