# ADR-004: Command Drafts Before Execution

## Status

Accepted.

## Context

Claw Cockpit shows OpenClaw command previews. A future run endpoint could become dangerous if it accepts arbitrary command strings from the browser.

## Decision

The UI may show command drafts, but execution is not implemented.

When execution is added, it must use:

- server-side command IDs
- allowlisted `execFile` argument templates
- strict parameter validation
- a review nonce or confirmation token
- origin/host checks
- audit logging

The browser must never send an arbitrary shell command to run.

## Consequences

- Beginner users can review safely before anything changes.
- Current command previews must match the live CLI shape or be labeled as non-runnable draft wording.
- Run buttons stay locked until the command catalog and review boundary exist.
