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
- Review runs
- Safety & drift

The browser should not know how to run OpenClaw commands directly.

## 2. The Local Adapter

Path: `server/index.mjs`

This is the translator between OpenClaw and the UI. It reads the OpenClaw CLI, gateway, config, and reminder files, then sends the browser a safer summary.

When OpenClaw changes, fix the adapter first.

## 3. The Smoke Checks

Paths:

- `scripts/smoke-overview.mjs`
- `scripts/smoke-ui.mjs`

These checks make sure the cockpit still starts, still reads OpenClaw, and still renders without obvious layout breaks.

Run:

```bash
npm run lint
npm run build
npm run smoke:overview
npm run smoke:ui
```

## What To Build Next

Good next steps are small and concrete:

- add one new setup warning
- add one new parser fixture
- improve one mobile layout issue
- explain one OpenClaw concept in plain English
- move one adapter responsibility into a smaller file
