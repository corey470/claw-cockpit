# ADR-005: Skill Workshop Drafts Before Install

## Status

Accepted.

## Context

OpenClaw power users shape their system through skills, but beginners need a safe place to see, understand, and draft skills before anything touches local skill folders.

## Decision

Claw Cockpit will start Skill Workshop as a read-and-draft surface:

- inventory local skill folders
- show beginner-readable quality signals
- generate `SKILL.md` previews from plain-English fields
- save reviewed drafts under `~/.openclaw/claw-cockpit/skill-drafts/`
- install only an already-saved draft through a validated server-side file-write path
- preview plugin pack files from saved drafts before any package folder is written

Skill install requires explicit confirmation, validates the skill name, copies only from the Cockpit draft folder, and refuses to overwrite a different existing `SKILL.md`.

Plugin packaging is not runnable until it has a server-side package writer with validation and smoke coverage.

## Consequences

- Beginners can learn the skill shape without risking their local setup.
- Contributors get a clear place to add skill quality checks.
- Install is useful but still narrow enough to audit.
- Plugin builder work can grow from reviewed skill groups instead of raw folder writes.
