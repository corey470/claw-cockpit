const baseUrl = process.env.COCKPIT_COMMAND_URL ?? 'http://127.0.0.1:4314'

const preview = await post('/api/commands/preview', {
  commandId: 'agent.add',
  params: {
    helperName: 'repo-helper',
    workspace: '/tmp/claw-cockpit-fixture',
  },
})

if (!preview.preview?.includes('openclaw agents add repo-helper')) {
  throw new Error('agent.add preview did not match expected command shape')
}

const run = await post('/api/commands/run', {
  commandId: 'cron.add',
  confirm: 'RUN',
  dryRun: true,
  params: {
    reminderName: 'Morning health check',
    agent: 'main',
    message: 'Run OpenClaw health check and summarize blockers',
    cron: '0 8 * * *',
    timezone: 'America/New_York',
  },
})

if (!run.ok) throw new Error(run.error || 'cron.add dry-run failed')
if (!run.dryRun) throw new Error('command smoke should always dry-run')

const warningFixIds = ['gateway.restart', 'security.audit.deep', 'model.main.set', 'plugin.discord.install']

for (const commandId of warningFixIds) {
  const warningFix = await post('/api/commands/run', {
    commandId,
    confirm: 'RUN',
    dryRun: true,
    params:
      commandId === 'model.main.set'
        ? { model: 'openai/gpt-5.4' }
        : commandId === 'plugin.discord.install'
          ? { pluginPackage: '@openclaw/discord' }
          : {},
  })
  if (!warningFix.ok) throw new Error(warningFix.error || `${commandId} dry-run failed`)
  if (!warningFix.dryRun) throw new Error(`${commandId} smoke should always dry-run`)
}

console.log(
  JSON.stringify(
    {
      ok: true,
      preview: preview.preview,
      dryRun: Boolean(run.dryRun),
      warningFixes: warningFixIds,
    },
    null,
    2,
  ),
)

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: baseUrl,
    },
    body: JSON.stringify(body),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json.error || `${path} returned HTTP ${response.status}`)
  return json
}
