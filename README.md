# Claw Cockpit

Task-focused local cockpit for OpenClaw.

Claw Cockpit is built for people who can get OpenClaw running, but do not want to live inside raw config, changing command flags, and scattered setup warnings. It does not depend on OpenClaw's own dashboard internals. Instead, it talks to the stable things operators already trust:

- the `openclaw` CLI
- the local gateway at `ws://127.0.0.1:18789`
- local state under `~/.openclaw`
- plain preview commands before any setup action runs

This is intentionally a beginner-readable repo. The code should be plain enough for a non-expert developer to follow, while still having real seams for contributors to extend.

## Product Goal

Make OpenClaw easier to operate without hiding the real system:

- check what OpenClaw sees right now
- plan setup changes before anything runs
- translate warnings into next steps
- draft helper and reminder commands from current CLI shape
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
- `Review runs` for session proof
- `Safety & drift` for compatibility checks

## Setup Planner

The Setup Planner page is not the live OpenClaw chat. Use normal OpenClaw Chat for agent conversations.

The planner lets a beginner say what setup change they want in normal language, then turns that into:

- a short explanation
- the setup area to review next
- a command preview when a command is known

For now, replies are local guide rails only. They do not call a helper or change OpenClaw yet.

## Review Step

Command previews open a review drawer before anything can become executable. The drawer explains:

- what the command is meant to do
- the exact command text
- what still needs to be confirmed

Reviewed commands are saved as local setup drafts in the planning flow. They are not persisted or executed yet.

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
npm run smoke:ui
```

## Safety Model

The first version is read-first:

- `/api/overview` reads OpenClaw status, gateway probe output, `openclaw.json`, and cron jobs.
- setup cards show command previews only.
- future write actions should require an explicit review screen before execution.

## Open Source Posture

This repo should be useful to other OpenClaw operators, not just pretty.

The project is MIT licensed. The goal is to make a friendly first layer for OpenClaw users and a clear starter repo for contributors who want to help improve agent operations tooling.

Contributors should be able to add:

- new setup checks
- new command draft templates
- parser fixtures for OpenClaw updates
- safer run/review flows
- docs for non-expert operators

The best contribution keeps both sides true: easier for beginners, sturdier for operators.

## Product Direction

This repo should grow as an adapter-first cockpit, not as a clone of the fast-changing OpenClaw UI. When OpenClaw changes, update the adapter parser or command mapping while keeping the beginner workflow stable.

See `docs/FUTURE_PROOFING.md` for the compatibility contract, drift risks, and smoke-check expectations.

Architecture decisions live in `docs/adr/`:

- adapter anti-corruption layer
- overview contract versioning
- raw signal redaction
- command drafts before execution

## Irie Product Philosophy

This app should follow `/Users/irieagent/Desktop/Skills for Web Design /IRIE_PRODUCT_PHILOSOPHY.md`.

For an agent-control product, that means:

- lead with control and visibility
- show what changed, what still needs attention, and what is safe to do next
- make approval and verification part of the main flow
- keep copy plain enough for a beginner who has never touched OpenClaw config
- avoid generic AI dashboard filler
- use task words first: Check OpenClaw, Plan a change, Fix warnings, Create helper, Add reminder, Review runs, Safety & drift
