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
- local skill folders such as `~/.codex/skills` and `~/.openclaw/skills`
- configured OpenClaw upstream, fork, or local repo sources when available

When any of these change, the UI should show a drift warning instead of pretending setup is safe.

## Known Drift Risks

- CLI commands may be renamed or moved behind new subcommands.
- `status --deep` table text may change, breaking text parsers.
- Config shape may move away from `agents.list`.
- Cron storage may normalize into a different registry file.
- Provider and model naming may change.
- Harness names can change, as seen with Codex harness registration.
- Plugins can become required, optional, renamed, or unpinned.
- Skill folder conventions can drift between OpenClaw, Codex, and plugin-provided skills.
- Security posture can change when the Control UI is exposed beyond localhost.
- Beta channel updates may change behavior several times a day.
- Repo tags and npm releases may not move at the same time.
- A local fork can be ahead of the installed CLI or behind upstream.
- Gateway auth and dashboard launch behavior can change without breaking the gateway itself.

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
- Write/run endpoints must use server-side command IDs and allowlisted `execFile` argument templates. Never execute command strings sent from the browser.
- Every new runnable command needs fixture or dry-run smoke coverage.
- Skill Workshop installs must stay saved-draft-only, require explicit confirmation, and refuse conflicting existing files.
- Plugin pack creation must stay reviewed-file-only, require explicit confirmation, and refuse conflicting existing files.
- Workspace suggestions should come from local source truth and should filter empty wrapper folders so beginners choose real projects.
- Upstream/fork checks must stay read-only unless a future reviewed update command is explicitly added.
- Fixture recording should save redacted evidence first; copying into committed fixtures is a separate review step.
- Repair recipes should say when a fix is not runnable yet instead of pretending Cockpit can safely patch everything.
- Runnable repair recipes must complete the loop: read current state, run only an allowlisted action, re-read state, and show before/after proof.

## Smoke Check

Run this while the dev server is up:

```bash
npm run smoke:overview
npm run smoke:compatibility
npm run smoke:workspaces
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

The workspace smoke check verifies that `/api/workspaces` returns absolute local folder paths, which protects the helper setup flow from blank or relative path choices.

The compatibility smoke check verifies that `/api/compatibility-report` returns:

- local OpenClaw update state
- configured repo/fork source summaries
- contract checks for CLI/status/config/gateway shape
- repair recipes for known drift
- a dry-run repair loop for at least one runnable recipe
- a redacted fixture recording path

## UI Copy Rule

Keep beginner words visible first:

- Helper = OpenClaw agent
- Reminder = OpenClaw cron job
- Setup Check = doctor/status/security readout
- History = recent sessions/runs
- Review = safe command preview
- Run = reviewed command ID plus validated fields
- Skill = reusable instructions OpenClaw/Codex can load
- Plugin pack = grouped skills and metadata written after review
- Update radar = OpenClaw version, fork, update, and contract drift
- Fixture = redacted proof of what OpenClaw output looked like

Technical names can appear in command previews and source labels.
