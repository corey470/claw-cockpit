# ADR-004: Command Drafts Before Execution

## Status

Accepted.

## Context

Claw Cockpit shows OpenClaw command previews. A future run endpoint could become dangerous if it accepts arbitrary command strings from the browser.

## Decision

The UI may show command drafts. Runnable commands must go through the server-side command catalog.

Execution must use:

- server-side command IDs
- allowlisted `execFile` argument templates
- strict parameter validation
- explicit user confirmation
- origin/host checks
- audit logging

The browser must never send an arbitrary shell command to run.

## Consequences

- Beginner users can review safely before anything changes.
- Current command previews must match the live CLI shape or be labeled as non-runnable draft wording.
- Run buttons are available only when a draft has a supported command ID.
- Warning/doctor commands stay preview-only until each action gets its own catalog entry.
