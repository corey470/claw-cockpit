# Claw Cockpit

Task-focused local cockpit for OpenClaw.

[![Validate](https://github.com/corey470/claw-cockpit/actions/workflows/validate.yml/badge.svg)](https://github.com/corey470/claw-cockpit/actions/workflows/validate.yml)

Claw Cockpit is built for people who can get OpenClaw running, but do not want to live inside raw config, changing command flags, and scattered setup warnings. It does not depend on OpenClaw's own dashboard internals. Instead, it talks to the stable things operators already trust:

- the `openclaw` CLI
- the local gateway at `ws://127.0.0.1:18789`
- local state under `~/.openclaw`
- plain preview commands before any setup action runs

This is intentionally a beginner-readable repo. The code should be plain enough for a non-expert developer to follow, while still having real seams for contributors to extend.

![Claw Cockpit plan change screen](docs/assets/claw-cockpit-plan-change.png)

## Product Goal

Make OpenClaw easier to operate without hiding the real system:

- check what OpenClaw sees right now
- plan setup changes before anything runs
- translate warnings into next steps
- draft helper and reminder commands from current CLI shape
- run reviewed helper/reminder setup through server-side allowlisted commands
- inventory local skills and draft new `SKILL.md` files without installing them
- show history, compatibility, and safety signals
- keep the adapter open enough for contributors to extend

## Sidebar Model

The sidebar is task-first:

- `Open OpenClaw Chat` for normal agent conversations
- `Check OpenClaw` for status and next move
- `Plan a change` for reviewed setup drafts
- `Fix warnings` for setup diagnosis
- `Create helper` for OpenClaw agent setup
- `Add reminder` for scheduled OpenClaw work
- `Build skills` for skill inventory and draft creation
- `Review runs` for session proof
- `Safety & drift` for compatibility checks

## Setup Planner

The Setup Planner page is not the live OpenClaw chat. Use normal OpenClaw Chat for agent conversations.

The planner lets a beginner say what setup change they want in normal language, then turns that into:

- a short explanation
- the setup area to review next
- a command preview when a command is known

For now, replies are local guide rails only. They do not call a helper or change OpenClaw yet.

## First Run Walkthrough

1. Start OpenClaw normally.
2. Run Claw Cockpit with `npm run dev`.
3. Use `Open OpenClaw Chat` for normal agent conversations.
4. Use `Plan a change` when you want a setup command drafted in plain English.
5. Use `Fix warnings` when OpenClaw reports something confusing.
6. Use `Create helper` or `Add reminder` to draft setup work before anything runs.
7. Use `Build skills` when you want to shape OpenClaw with a new reviewed skill draft.
8. Use `Safety & drift` after OpenClaw updates to see what the adapter is worried about.

![Claw Cockpit warning screen](docs/assets/claw-cockpit-fix-warnings.png)

## Review Step

Command previews open a review drawer before anything can become executable. The drawer explains:

- what the command is meant to do
- the exact command text
- what still needs to be confirmed

Reviewed commands are saved as local setup drafts in the planning flow.

Helper and reminder drafts can be run from the review drawer after the command passes the server-side catalog. Warning/doctor commands stay preview-only until each one has its own allowlisted template.

![Claw Cockpit review and run drawer](docs/assets/claw-cockpit-review-run.png)

## Skill Workshop

The Skill Workshop is the first step toward making Claw Cockpit a friendly skill-building surface for OpenClaw users.

It can:

- scan local skill folders
- show plain-English quality signals
- draft a new `SKILL.md` from beginner-friendly fields
- open the draft in the same review drawer used by command previews

It does not install skills yet. Install/package actions should use the same reviewed command-catalog pattern before becoming runnable.

## Run Locally

```bash
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:4320
```

The local adapter runs on `127.0.0.1:4314` and the Vite app proxies `/api/*` to it.

With the dev server running, check the adapter contract:

```bash
npm run smoke:overview
npm run smoke:skills
npm run smoke:ui
```

GitHub Actions runs `npm run ci:smoke` against redacted fixtures, so contributors can validate the app even if they do not have OpenClaw installed locally.

## Safety Model

The default posture is review-first:

- `/api/overview` reads OpenClaw status, gateway probe output, `openclaw.json`, and cron jobs.
- setup cards show command previews first.
- `/api/commands/run` accepts only server-side command IDs, validated fields, and explicit confirmation.
- `/api/skills/draft` returns draft file content only; it does not write or install skills.
- command smoke tests use dry-run mode so CI never changes a live OpenClaw install.

## Open Source Posture

This repo should be useful to other OpenClaw operators, not just pretty.

The project is MIT licensed. The goal is to make a friendly first layer for OpenClaw users and a clear starter repo for contributors who want to help improve agent operations tooling.

Contributors should be able to add:

- new setup checks
- new command draft templates
- new skill draft templates and skill quality checks
- parser fixtures for OpenClaw updates
- safer run/review flows
- docs for non-expert operators

The best contribution keeps both sides true: easier for beginners, sturdier for operators.

## Product Direction

This repo should grow as an adapter-first cockpit, not as a clone of the fast-changing OpenClaw UI. When OpenClaw changes, update the adapter parser or command mapping while keeping the beginner workflow stable.

See `docs/FUTURE_PROOFING.md` for the compatibility contract, drift risks, and smoke-check expectations.

The adapter is split into source readers, parsers, compatibility scoring, and overview normalization. Start with `docs/BEGINNER_MAP.md` if you are new to the codebase.

Architecture decisions live in `docs/adr/`:

- adapter anti-corruption layer
- overview contract versioning
- raw signal redaction
- command drafts before execution
- skill workshop drafts before install

## Current Readiness

Claw Cockpit is now ready for real local work as a review-first OpenClaw cockpit:

- status, warnings, helpers, reminders, sessions, and drift are readable
- helper and reminder setup can be reviewed and run through the safe catalog
- local skills can be inventoried and new `SKILL.md` drafts can be reviewed
- command runs are audit-logged under the local OpenClaw home
- GitHub Actions validates the app with fixtures
- live local smoke checks validate your machine path

The remaining gap before calling it fully complete is broad command coverage: warning fixes, skill installs, plugin packaging, and more OpenClaw maintenance actions need their own allowlisted templates before they become runnable.

## Irie Product Philosophy

This app should follow `/Users/irieagent/Desktop/Skills for Web Design /IRIE_PRODUCT_PHILOSOPHY.md`.

For an agent-control product, that means:

- lead with control and visibility
- show what changed, what still needs attention, and what is safe to do next
- make approval and verification part of the main flow
- keep copy plain enough for a beginner who has never touched OpenClaw config
- avoid generic AI dashboard filler
- use task words first: Check OpenClaw, Plan a change, Fix warnings, Create helper, Add reminder, Build skills, Review runs, Safety & drift
