import {
  extractLine,
  parseSecuritySummary,
  parseTableValue,
  parseVersion,
  sortChecksByRisk,
  textFrom,
  worstState,
} from './openclawParsers.mjs'

export function buildChecks({ status, probe, statusText, probeText, config }) {
  const checks = []
  const mainAgent = Array.isArray(config?.agents?.list)
    ? config.agents.list.find((agent) => agent?.id === 'main')
    : null
  const mainModel = typeof mainAgent?.model === 'string' ? mainAgent.model : mainAgent?.model?.primary
  const gatewayReachable = isGatewayReachable({ statusText, probeText })

  checks.push({
    id: 'gateway',
    title: probeText.includes('Reachable: yes')
      ? 'OpenClaw is reachable'
      : gatewayReachable
        ? 'OpenClaw is reachable through status'
        : 'Gateway is not answering',
    detail: probeText.includes('Reachable: yes')
      ? 'The local WebSocket gateway answered the cockpit probe.'
      : gatewayReachable
        ? 'The gateway probe returned warnings, but status reports the local gateway as reachable.'
        : probe.error || 'Start or repair the OpenClaw gateway before running agents.',
    state: probeText.includes('Reachable: yes') ? 'healthy' : gatewayReachable ? 'attention' : 'blocked',
    command: gatewayReachable ? undefined : 'openclaw gateway restart',
  })

  checks.push({
    id: 'service',
    title: statusText.includes('LaunchAgent installed · loaded · running')
      ? 'LaunchAgent is loaded'
      : 'LaunchAgent may not survive restart',
    detail: extractLine(statusText, 'Gateway service') || 'The service state was not clear in status output.',
    state: statusText.includes('LaunchAgent installed · loaded · running') ? 'healthy' : 'attention',
    command: statusText.includes('LaunchAgent installed · loaded · running') ? undefined : 'openclaw gateway restart',
  })

  checks.push({
    id: 'main-model',
    title: mainModel && !mainModel.includes('gpt-5-mini') ? 'Main agent model is usable' : 'Main agent model needs review',
    detail: mainModel
      ? `main is configured for ${mainModel}.`
      : 'The cockpit could not find a main agent model in openclaw.json.',
    state: mainModel && !mainModel.includes('gpt-5-mini') ? 'healthy' : 'attention',
    command:
      mainModel && !mainModel.includes('gpt-5-mini')
        ? undefined
        : 'openclaw config set agents.list[0].model \'{"primary":"openai/gpt-5.4"}\' --strict-json',
  })

  checks.push({
    id: 'discord',
    title: statusText.includes('Discord  │ ON      │ WARN') ? 'Discord plugin is missing' : 'Messaging plugins look stable',
    detail: statusText.includes('Discord  │ ON      │ WARN')
      ? 'OpenClaw has Discord enabled, but the plugin is not installed. Disable it or install the plugin.'
      : 'No Discord plugin warning appeared in the deep status output.',
    state: statusText.includes('Discord  │ ON      │ WARN') ? 'attention' : 'healthy',
    command: statusText.includes('Discord  │ ON      │ WARN')
      ? 'openclaw plugins install @openclaw/discord'
      : undefined,
  })

  checks.push({
    id: 'raw-config',
    title: status.ok ? 'No raw config required' : 'Status command failed',
    detail: status.ok
      ? 'This screen translates OpenClaw state into plain-English setup checks.'
      : status.error || 'The OpenClaw status command did not complete.',
    state: status.ok ? 'healthy' : 'attention',
  })

  return checks
}

export function buildCompatibility({ sources, statusText, probeText, paths }) {
  const { status, probe, cliHelp, agentsHelp, cronHelp, configRead, jobsRead } = sources
  const cliHelpText = textFrom(cliHelp)
  const agentsHelpText = textFrom(agentsHelp)
  const cronHelpText = textFrom(cronHelp)
  const requiredCommands = ['status', 'doctor', 'gateway', 'agents', 'cron', 'plugins', 'security', 'models']
  const commandAvailability = Object.fromEntries(
    requiredCommands.map((command) => [
      command,
      new RegExp(`\\b${command}\\b`).test(cliHelpText) || Boolean(sources.commandHelp?.[command]?.ok),
    ]),
  )
  const missingCommands = requiredCommands.filter((command) => !commandAvailability[command])
  const securitySummary = parseSecuritySummary(statusText)
  const channel = parseTableValue(statusText, 'Channel')
  const update = parseTableValue(statusText, 'Update')
  const exposure = parseTableValue(statusText, 'Tailscale exposure')
  const pluginCompatibility = parseTableValue(statusText, 'Plugin compatibility')
  const unpinnedPlugins = statusText.includes('Plugin index includes unpinned npm specs')
  const allowInsecureAuth = statusText.includes('allowInsecureAuth=true')
  const hasAgentAdd = /\badd\b/.test(agentsHelpText)
  const hasCronAdd = /\badd\b/.test(cronHelpText)
  const gatewayReachable = isGatewayReachable({ statusText, probeText })
  const statusHasExpectedShape =
    statusText.includes('Overview') &&
    statusText.includes('Gateway') &&
    statusText.includes('Sessions') &&
    parseVersion(statusText) !== 'unknown'

  const checks = sortChecksByRisk([
    {
      id: 'cli-surface',
      title: missingCommands.length === 0 ? 'CLI surface is readable' : 'CLI commands changed',
      detail: missingCommands.length === 0
        ? 'The adapter can see the OpenClaw commands it depends on.'
        : `Missing or renamed commands: ${missingCommands.join(', ')}.`,
      state: missingCommands.length === 0 ? 'healthy' : 'blocked',
      source: 'openclaw --help',
      command: missingCommands.length === 0 ? undefined : 'openclaw --help',
    },
    {
      id: 'worker-job-commands',
      title: hasAgentAdd && hasCronAdd ? 'Worker and job commands are present' : 'Setup commands need remapping',
      detail: hasAgentAdd && hasCronAdd
        ? 'The adapter still sees agents add and cron add for draft generation.'
        : 'The command names for creating workers or scheduled work may have changed.',
      state: hasAgentAdd && hasCronAdd ? 'healthy' : 'attention',
      source: 'openclaw agents --help / openclaw cron --help',
    },
    {
      id: 'parser-shape',
      title: statusHasExpectedShape ? 'Status output matches expected shape' : 'Status parser needs review',
      detail: statusHasExpectedShape
        ? 'The deep status output still exposes overview, gateway, version, and sessions.'
        : 'OpenClaw status output changed enough that the adapter may be guessing.',
      state: statusHasExpectedShape ? 'healthy' : 'attention',
      source: 'openclaw status --deep',
    },
    {
      id: 'local-state',
      title: configRead.ok ? 'Local config is readable' : 'Local config read failed',
      detail: configRead.ok
        ? `${paths.openclawConfigPath} parsed cleanly.`
        : `Could not parse ${paths.openclawConfigPath}: ${configRead.error}`,
      state: configRead.ok ? 'healthy' : 'blocked',
      source: paths.openclawConfigPath,
    },
    {
      id: 'jobs-state',
      title: jobsRead.ok ? 'Scheduled work registry is readable' : 'No scheduled work registry yet',
      detail: jobsRead.ok
        ? `${paths.cronJobsPath} parsed cleanly.`
        : 'No local cron registry was found. That is okay while no scheduled work exists yet.',
      state: 'healthy',
      source: paths.cronJobsPath,
    },
    {
      id: 'security-posture',
      title:
        securitySummary.found
          ? securitySummary.critical > 0
            ? 'Security audit has critical items'
            : 'Security audit is visible'
          : 'Security audit summary was not found',
      detail:
        securitySummary.found
          ? `${securitySummary.critical} critical, ${securitySummary.warn} warnings, ${securitySummary.info} info.`
          : 'OpenClaw may have changed the audit output. Run the deep audit before trusting security state.',
      state: securitySummary.found
        ? securitySummary.critical > 0
          ? 'blocked'
          : securitySummary.warn > 0
            ? 'attention'
            : 'healthy'
        : 'attention',
      source: 'openclaw status --deep security audit',
      command:
        !securitySummary.found || securitySummary.warn > 0 || securitySummary.critical > 0
          ? 'openclaw security audit --deep'
          : undefined,
    },
    {
      id: 'supply-chain',
      title: unpinnedPlugins ? 'Plugin install specs need pinning' : 'Plugin specs look pinned or clean',
      detail: unpinnedPlugins
        ? 'At least one plugin install record is unpinned. Pinning lowers update surprise.'
        : 'No unpinned plugin warning appeared in status.',
      state: unpinnedPlugins ? 'attention' : 'healthy',
      source: 'security audit',
    },
    {
      id: 'auth-exposure',
      title:
        exposure === 'off' && !allowInsecureAuth
          ? 'Control surface is local-only'
          : 'Control surface auth needs review',
      detail: exposure
        ? `Tailscale exposure: ${exposure}. ${allowInsecureAuth ? 'Insecure auth toggle is also enabled.' : ''}`.trim()
        : 'The adapter could not read exposure state.',
      state: exposure === 'off' && !allowInsecureAuth ? 'healthy' : 'attention',
      source: 'openclaw status --deep',
    },
    {
      id: 'update-channel',
      title: channel.includes('beta') ? 'Fast update channel detected' : 'Update channel is steady',
      detail: `${channel || 'unknown channel'} · ${update || 'unknown update status'}`,
      state: channel.includes('beta') ? 'attention' : 'healthy',
      source: 'openclaw status --deep',
    },
    {
      id: 'gateway-contract',
      title: probe.ok && probeText.includes('Reachable: yes')
        ? 'Gateway probe contract works'
        : gatewayReachable
          ? 'Gateway reachable through status fallback'
          : 'Gateway probe contract changed',
      detail: probe.ok && probeText.includes('Reachable: yes')
        ? extractLine(probeText, 'Local loopback') || 'Gateway probe responded.'
        : gatewayReachable
          ? 'The gateway probe returned warnings, but status still reports the local gateway.'
          : probe.error || 'Gateway probe did not complete.',
      state: probe.ok && probeText.includes('Reachable: yes') ? 'healthy' : gatewayReachable ? 'attention' : 'blocked',
      source: 'openclaw gateway probe',
    },
    {
      id: 'plugin-compatibility',
      title: pluginCompatibility === 'none' ? 'No plugin compatibility drift reported' : 'Plugin compatibility drift reported',
      detail: pluginCompatibility || 'Plugin compatibility was not present in status output.',
      state: pluginCompatibility === 'none' ? 'healthy' : 'attention',
      source: 'openclaw status --deep',
    },
  ])

  const posture = worstState(checks)
  return {
    posture,
    summary:
      posture === 'blocked'
        ? 'OpenClaw changed in a way that can block safe setup.'
        : posture === 'attention'
          ? 'OpenClaw is usable, but there are drift signals to watch.'
          : 'OpenClaw looks compatible with this cockpit.',
    checks,
    signals: {
      version: parseVersion(statusText),
      channel: channel || 'unknown',
      update: update || 'unknown',
      statusCommandOk: status.ok,
      gatewayProbeOk: probe.ok,
      security: {
        found: securitySummary.found,
        critical: securitySummary.critical,
        warn: securitySummary.warn,
        info: securitySummary.info,
      },
      generatedAt: new Date().toISOString(),
    },
  }
}

function isGatewayReachable({ statusText, probeText }) {
  const gatewayStatus = parseTableValue(statusText, 'Gateway')
  return probeText.includes('Reachable: yes') || /\b(local|reachable)\b/i.test(gatewayStatus)
}
