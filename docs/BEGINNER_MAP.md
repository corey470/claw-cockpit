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
- Update radar
- Safety & drift

The browser should not know how to run OpenClaw commands directly.

## 2. The Local Adapter

Paths:

- `server/index.mjs`
- `server/openclawSources.mjs`
- `server/openclawParsers.mjs`
- `server/compatibilityScoring.mjs`
- `server/compatibilityReport.mjs`
- `server/contractTester.mjs`
- `server/updateRadar.mjs`
- `server/fixtureRecorder.mjs`
- `server/repairRecipes.mjs`
- `server/repairRunner.mjs`
- `server/overviewNormalizer.mjs`
- `server/commandCatalog.mjs`
- `server/skillWorkshop.mjs`
- `server/workspaces.mjs`

This is the translator between OpenClaw and the UI. It reads the OpenClaw CLI, gateway, config, reminder files, update signals, and configured repo/fork sources, then sends the browser a safer summary.

It also reads local skill folders, creates skill drafts, saves reviewed drafts under the Cockpit draft folder, installs saved drafts through a narrow server path, writes reviewed plugin packs, and suggests local project folders for helper setup.

When a detected issue has a safe recipe, `repairRunner` runs the allowlisted action and checks OpenClaw again so the UI can show before/after proof.

When OpenClaw changes, fix the adapter first.

When a setup action needs to become runnable, add it to the command catalog. Do not make the browser send shell commands.

If you do not have OpenClaw installed, use the fixture path:

```bash
npm run ci:smoke
```

## 3. The Smoke Checks

Paths:

- `scripts/smoke-overview.mjs`
- `scripts/smoke-compatibility.mjs`
- `scripts/smoke-ui.mjs`
- `scripts/smoke-commands.mjs`
- `scripts/smoke-skills.mjs`
- `scripts/smoke-workspaces.mjs`
- `scripts/ci-smoke.mjs`

These checks make sure the cockpit still starts, still reads OpenClaw, and still renders without obvious layout breaks.

Run:

```bash
npm run lint
npm run build
npm run smoke:overview
npm run smoke:compatibility
npm run smoke:workspaces
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
- improve the saved-draft install review copy
- add a full marketplace writer for a chosen `.agents/plugins/marketplace.json`
- move one adapter responsibility into a smaller file
- add one more allowlisted warning fix with validation and dry-run coverage
- turn one preview-only repair recipe into a full repair loop with before/after proof
