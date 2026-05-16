# Claw Cockpit Roadmap

## Now

- Keep `/api/overview` stable and redacted.
- Keep command drafts current with live OpenClaw CLI help.
- Make the sidebar task-first instead of app-tab-first.
- Add smoke checks for UI rendering and adapter contract.

## Next

- Split `server/index.mjs` into source readers, parsers, normalizers, and compatibility scoring.
- Add a `docs/fixtures/` guide with captured, redacted examples of OpenClaw output.
- Add fixture tests for OpenClaw output drift.
- Persist reviewed setup drafts locally.
- Make `Fix warnings`, `Create helper`, `Add reminder`, `Review runs`, and `Safety & drift` true focused views.
- Add a command catalog returned by the adapter instead of hard-coding command drafts in the UI.

## Later

- Add safe execution only through server-side command IDs and allowlisted `execFile` templates.
- Add import/export for cockpit setup drafts.
- Add plugin-specific compatibility checks.
- Add a public documentation site for non-expert OpenClaw operators.

## Not A Goal

Claw Cockpit should not clone the fast-changing OpenClaw dashboard.

It should be the steady task layer beside OpenClaw:

```text
Check what OpenClaw sees.
Understand what needs attention.
Plan the next setup change.
Review before anything runs.
```
