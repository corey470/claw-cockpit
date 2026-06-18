# Current Status

Last updated: June 18, 2026

This file reflects the current `main` branch after the latest cockpit hardening pass. Use the README badge for the latest GitHub validation result.

## Verdict

Claw Cockpit is ready for real local OpenClaw work as a review-first cockpit and compatibility radar.

It is not a replacement for OpenClaw Chat. It is the safer control layer for checking status, understanding warnings, drafting setup, creating helpers/reminders, reviewing runs, building skills, packaging reviewed skill drafts, watching OpenClaw updates, and recording drift evidence.

## What Works Now

- Reads live OpenClaw status, gateway probe, local config, helpers, reminders, sessions, and compatibility signals.
- Keeps the UI beginner-readable while adapter code handles OpenClaw churn.
- Runs helper and reminder setup only through server-side command IDs.
- Runs gateway restart, deep security audit, main model repair, and Discord plugin install warning fixes through reviewed command IDs.
- Inventories local skills and drafts beginner-friendly `SKILL.md` files.
- Saves reviewed skill drafts under the Cockpit draft folder.
- Installs saved skill drafts through the review drawer and a narrow copy-only path.
- Writes reviewed plugin packs with `.codex-plugin/plugin.json`, `marketplace-entry.json`, copied skill files, and Cockpit metadata.
- Suggests real local workspace folders for helper setup.
- Opens OpenClaw through the token-aware `openclaw dashboard --yes` path instead of a stale unauthenticated chat URL.
- Adds Update Radar for local version/channel/update state plus configured upstream/fork/local repo inspection.
- Adds a compatibility contract report for CLI/status/config/gateway drift.
- Adds redacted fixture recording under the local OpenClaw home.
- Adds repair recipes for update drift, blocked contracts, gateway trouble, security audit drift, CLI remapping, parser shape drift, and plugin pinning.
- Adds full repair loops for runnable recipes: detect the issue, execute the allowlisted action, re-read OpenClaw, and return before/after proof.
- Includes README demo media and GitHub issue/PR templates.
- Validates with local lint/build/smoke checks and GitHub Actions fixture smoke.

## Safety Boundaries

- The browser never sends raw shell commands to execute.
- Runnable setup uses server-side IDs, explicit confirmation, validation, and audit logging.
- Skill install only copies an already-saved draft and refuses conflicting existing `SKILL.md` files.
- Plugin pack writing starts from a reviewed preview and refuses conflicting manifest or skill files.
- Repo/fork checks are read-only.
- Fixture recording requires explicit local confirmation and writes redacted output outside the repo by default.
- Repair loops require explicit local confirmation, accept only runnable recipe IDs, and can only call the allowlisted command catalog or fixture recorder.
- Raw OpenClaw output stays out of the browser unless local debug mode is explicitly enabled and redaction runs first.

## Still To Address

These are not launch blockers, but they are the right next improvements:

- Add allowlisted config-edit actions beyond main model repair.
- Add a full marketplace writer that can update a chosen `.agents/plugins/marketplace.json`.
- Review recorded live fixtures and promote useful ones into committed parser fixtures.
- Add a reviewed update workflow after repo/fork source settings are proven on more machines.
- Add more warning recipes beyond the four current allowlisted fixes.
- Promote more repair recipes from preview-only to full repair loops after each one has validation and dry-run smoke coverage.
- Improve saved-skill install review copy with a side-by-side file preview.
- Add real-user mobile QA once more people try the cockpit.

## Verification Commands

```bash
npm run lint
npm run build
npm run smoke:overview
npm run smoke:compatibility
npm run smoke:workspaces
npm run smoke:commands
npm run smoke:skills
npm run smoke:ui
npm run ci:smoke
```

Use `npm run ci:smoke` when OpenClaw is not installed or when you want the same fixture-backed path GitHub Actions uses.
