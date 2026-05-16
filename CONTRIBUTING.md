# Contributing to Claw Cockpit

Claw Cockpit is meant to be approachable for OpenClaw operators and useful for developers who want to improve the control layer.

You do not need to be an expert developer to contribute. Small, clear improvements are welcome, especially when they make OpenClaw easier to understand without hiding what is really happening.

## Product Rules

- Keep OpenClaw Chat and Claw Cockpit separate.
- Use task-first language before technical labels.
- Show what was checked, what changed, and what is safe to do next.
- Do not add run/execution features without the command catalog and review boundary described in `docs/adr/ADR-004-command-drafts-before-execution.md`.
- Do not expose raw OpenClaw output or secrets to the browser.

## Good First Contributions

- Add a parser fixture for a new OpenClaw version.
- Add a setup check with a plain-English explanation.
- Add a command draft template that matches current `openclaw --help` output.
- Improve mobile task navigation.
- Add docs that help operators understand OpenClaw concepts without hiding the real command.

## How To Think About Changes

- UI changes should answer a task: check, plan, fix, create, remind, review, or verify.
- Adapter changes should protect the UI from OpenClaw drift.
- Documentation changes should help the next beginner understand the current truth faster.
- Security-sensitive changes should start from `SECURITY.md` and `docs/adr/ADR-004-command-drafts-before-execution.md`.

## Verification

Run these before submitting changes:

```bash
npm run lint
npm run build
npm run smoke:overview
npm run smoke:ui
```

If OpenClaw drift is intentionally being inspected and compatibility is blocked, document why before using:

```bash
npm run smoke:overview -- --allow-drift
```
