# Claw Cockpit Roadmap

## Now

- Keep `/api/overview` stable and redacted.
- Keep command drafts current with live OpenClaw CLI help.
- Keep the sidebar task-first instead of app-tab-first.
- Keep smoke checks running against both live OpenClaw and redacted fixtures.

## Next

- Add a `docs/fixtures/` guide with captured, redacted examples of OpenClaw output.
- Add fixture tests for OpenClaw output drift.
- Persist reviewed setup drafts locally.
- Add a command catalog returned by the adapter instead of hard-coding command drafts in the UI.

## Later

- Add safe execution only through server-side command IDs and allowlisted `execFile` templates.
- Add import/export for cockpit setup drafts.
- Add plugin-specific compatibility checks.
- Add a public documentation site for non-expert OpenClaw operators.

## Done

- Public GitHub repo with MIT license, issue templates, PR template, and topics.
- GitHub Actions validation with fixture-backed smoke testing.
- Adapter split into sources, parsers, compatibility scoring, and overview normalization.
- Focused task pages for warnings, helpers, reminders, runs, and safety drift.
- README screenshots and first-run walkthrough.

## Not A Goal

Claw Cockpit should not clone the fast-changing OpenClaw dashboard.

It should be the steady task layer beside OpenClaw:

```text
Check what OpenClaw sees.
Understand what needs attention.
Plan the next setup change.
Review before anything runs.
```
