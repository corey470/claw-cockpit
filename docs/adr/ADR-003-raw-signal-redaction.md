# ADR-003: Raw Signal Redaction

## Status

Accepted.

## Context

OpenClaw status and audit output can include local paths, account hints, plugin details, provider state, or secret-adjacent values.

## Decision

The normal `/api/overview` response does not include raw OpenClaw status.

Raw status can only be exposed with `COCKPIT_DEBUG_RAW_STATUS=1`, and it must pass through redaction first.

## Consequences

- The beginner UI gets proof without leaking raw machine details.
- Future debug endpoints must be local-only, redacted, and clearly labeled.
- Any new command-output field must go through the same redaction boundary.
