# Security Policy

Claw Cockpit is a local control surface for OpenClaw. It should stay careful by default because it can see local OpenClaw state.

## Current Safety Boundary

- The browser receives normalized status, not raw OpenClaw output.
- Command previews must pass through a server-side catalog before they can run.
- No browser request can execute an arbitrary shell command.
- Raw OpenClaw output is hidden unless local debug mode is explicitly enabled.
- Run features use server-side command IDs, allowlisted arguments, strict validation, explicit confirmation, and audit logging.

## Reporting A Problem

If you find a way for Claw Cockpit to expose secrets, leak raw machine paths unexpectedly, or run commands without a review step, open a private report if the repo host supports it. If private reports are not available yet, open a minimal issue that says a security review is needed without posting secrets or exploit details.

## Contributor Rule

When in doubt, keep the UI read-only and add a review step before any action can change OpenClaw. Never add a browser-supplied shell command field.
