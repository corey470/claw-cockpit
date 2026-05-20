## What changed

Describe the change in plain English.

## Why it helps

Which OpenClaw task does this make easier?

## Safety check

- [ ] I did not expose raw OpenClaw output or secrets to the browser.
- [ ] Any command action stays behind a review step.
- [ ] I updated docs or tests if the adapter contract changed.

## Verification

```bash
npm run lint
npm run build
npm run smoke:overview
npm run smoke:workspaces
npm run smoke:commands
npm run smoke:skills
npm run smoke:ui
```

Use `npm run ci:smoke` for the full fixture-backed check.
