# Beginner Map

This repo has three main parts.

## 1. The Browser App

Path: `src/App.tsx`

This is what people see. Keep it task-first:

- Check OpenClaw
- Plan a change
- Fix warnings
- Create helper
- Add reminder
- Build skills
- Review runs
- Safety & drift

The browser should not know how to run OpenClaw commands directly.

## 2. The Local Adapter

Paths:

- `server/index.mjs`
- `server/openclawSources.mjs`
- `server/openclawParsers.mjs`
- `server/compatibilityScoring.mjs`
- `server/overviewNormalizer.mjs`
- `server/commandCatalog.mjs`
- `server/skillWorkshop.mjs`

This is the translator between OpenClaw and the UI. It reads the OpenClaw CLI, gateway, config, and reminder files, then sends the browser a safer summary.

It also reads local skill folders, creates skill drafts, and saves reviewed drafts under the Cockpit draft folder. Install/package commands stay separate until they are allowlisted.

When OpenClaw changes, fix the adapter first.

When a setup action needs to become runnable, add it to the command catalog. Do not make the browser send shell commands.

If you do not have OpenClaw installed, use the fixture path:

```bash
npm run ci:smoke
```

## 3. The Smoke Checks

Paths:

- `scripts/smoke-overview.mjs`
- `scripts/smoke-ui.mjs`
- `scripts/smoke-commands.mjs`
- `scripts/smoke-skills.mjs`
- `scripts/ci-smoke.mjs`

These checks make sure the cockpit still starts, still reads OpenClaw, and still renders without obvious layout breaks.

Run:

```bash
npm run lint
npm run build
npm run smoke:overview
npm run smoke:skills
npm run smoke:ui
```

## What To Build Next

Good next steps are small and concrete:

- add one new setup warning
- add one new parser fixture
- improve one mobile layout issue
- explain one OpenClaw concept in plain English
- add one skill quality check
- move one adapter responsibility into a smaller file
- add one allowlisted command with validation and dry-run coverage
