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

Skill install, export, and plugin packaging are not runnable until each action has a server-side allowlisted command or file-write path with validation and smoke coverage.

## Consequences

- Beginners can learn the skill shape without risking their local setup.
- Contributors get a clear place to add skill quality checks.
- Plugin builder work can grow from reviewed skill groups instead of raw folder writes.
