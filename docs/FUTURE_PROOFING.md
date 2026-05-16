# Claw Cockpit Future-Proofing

Claw Cockpit should assume OpenClaw will keep changing quickly.

The product promise is not "mirror every OpenClaw screen." The promise is:

```text
Tell me what OpenClaw sees, what changed, what needs attention, and what is safe to do next.
```

## Stable Contract

Use these as the adapter contract before depending on OpenClaw UI internals:

- `openclaw --help`
- `openclaw status --deep`
- `openclaw gateway probe`
- `openclaw agents --help`
- `openclaw cron --help`
- `~/.openclaw/openclaw.json`
- `~/.openclaw/cron/jobs.json`

When any of these change, the UI should show a drift warning instead of pretending setup is safe.

## Known Drift Risks

- CLI commands may be renamed or moved behind new subcommands.
- `status --deep` table text may change, breaking text parsers.
- Config shape may move away from `agents.list`.
- Cron storage may normalize into a different registry file.
- Provider and model naming may change.
- Harness names can change, as seen with Codex harness registration.
- Plugins can become required, optional, renamed, or unpinned.
- Security posture can change when the Control UI is exposed beyond localhost.
- Beta channel updates may change behavior several times a day.

## Adapter Rules

- Count from source truth, not from the displayed slice.
- Show only a limited list in the UI, but keep totals accurate.
- Sort risk signals by severity so attention items are not hidden below green checks.
- Keep command generation behind review.
- If a parser is guessing, say so in plain English.
- Prefer capability checks over version checks.
- Store raw signals enough for debugging, but never expose secrets.
- Do not return raw OpenClaw command output to the browser unless a local debug flag is explicitly enabled and redaction runs first.
- Treat security audit warnings as product signals, not terminal noise.
- Version the adapter contract and fail smoke checks when the schema changes.
- Future write/run endpoints must use server-side command IDs and allowlisted `execFile` argument templates. Never execute command strings sent from the browser.

## Smoke Check

Run this while the dev server is up:

```bash
npm run smoke:overview
```

Run this when OpenClaw is not available, such as in GitHub Actions:

```bash
npm run ci:smoke
```

It checks that `/api/overview` still returns the expected compatibility contract:

- gateway state
- setup checks
- accurate helper count
- compatibility posture
- key compatibility checks

## UI Copy Rule

Keep beginner words visible first:

- Helper = OpenClaw agent
- Reminder = OpenClaw cron job
- Setup Check = doctor/status/security readout
- History = recent sessions/runs
- Review = safe command preview

Technical names can appear in command previews and source labels.
