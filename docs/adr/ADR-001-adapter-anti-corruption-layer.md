# ADR-001: Adapter Anti-Corruption Layer

## Status

Accepted.

## Context

OpenClaw updates quickly. Claw Cockpit should not depend on OpenClaw's own UI internals or assume human-readable CLI output will stay stable.

## Decision

Claw Cockpit uses a local adapter as an anti-corruption layer between OpenClaw and the beginner UI.

The adapter may read:

- OpenClaw CLI capability output
- OpenClaw gateway probe output
- local OpenClaw config/state files
- sanitized status and security signals

The UI receives normalized beginner-facing data only.

## Consequences

- Drift is shown as a compatibility issue instead of silently breaking the UI.
- Raw OpenClaw output is not a product contract.
- Future work should split the adapter into source readers, parsers, normalizers, and compatibility scoring.
