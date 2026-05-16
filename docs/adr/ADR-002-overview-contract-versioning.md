# ADR-002: Overview Contract Versioning

## Status

Accepted.

## Context

The frontend depends on `/api/overview`. If the adapter changes shape without warning, the app can render misleading data or blank screens.

## Decision

Every `/api/overview` response includes an adapter identity and schema version.

The smoke check validates the schema version and required compatibility checks.

## Consequences

- Contract changes must be intentional.
- `npm run smoke:overview` catches missing fields and raw-status leaks.
- A future shared runtime schema should replace duplicated server/frontend types.
