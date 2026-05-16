import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const port = Number.parseInt(process.env.COCKPIT_API_PORT ?? '4314', 10)
const openclawHome = process.env.OPENCLAW_HOME || join(homedir(), '.openclaw')
const openclawConfigPath = process.env.OPENCLAW_CONFIG_PATH || join(openclawHome, 'openclaw.json')
const cronJobsPath = join(openclawHome, 'cron', 'jobs.json')

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`)

  if (url.pathname === '/api/overview') {
    const body = await buildOverview()
    sendJson(response, 200, body)
    return
  }

  if (url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, generatedAt: new Date().toISOString() })
    return
  }

  sendJson(response, 404, { error: 'Not found' })
}).listen(port, '127.0.0.1', () => {
  console.log(`[claw-cockpit] adapter listening at http://127.0.0.1:${port}`)
})

async function buildOverview() {
  const [status, probe, configRead, jobsRead, cliHelp, agentsHelp, cronHelp] = await Promise.all([
    runOpenClaw(['status', '--deep'], 12_000),
    runOpenClaw(['gateway', 'probe'], 6_000),
    readJsonFile(openclawConfigPath, {}),
    readJsonFile(cronJobsPath, []),
    runOpenClaw(['--help'], 6_000),
    runOpenClaw(['agents', '--help'], 6_000),
    runOpenClaw(['cron', '--help'], 6_000),
  ])

  const config = configRead.value
  const jobs = jobsRead.value
  const statusText = `${status.stdout}\n${status.stderr}`.trim()
  const probeText = `${probe.stdout}\n${probe.stderr}`.trim()
  const agents = summarizeAgents(config)
  const jobSummaries = summarizeJobs(jobs)
  const sessions = summarizeSessions(status.stdout)
  const checks = buildChecks({ status, probe, statusText, probeText, config })
  const compatibility = buildCompatibility({
    status,
    probe,
    cliHelp,
    agentsHelp,
    cronHelp,
    statusText,
    probeText,
    configRead,
    jobsRead,
  })
  const setupWarnings = checks.filter((check) => check.state === 'attention' || check.state === 'blocked').length
  const compatibilityWarnings = compatibility.checks.filter(
    (check) => check.state === 'attention' || check.state === 'blocked',
  ).length
  const securityWarnings = compatibility.signals.security.warn + compatibility.signals.security.critical
  const agentTotal = countConfiguredAgents(config, statusText)
  const sessionTotal = countActiveSessions(statusText, sessions.length)
  const debugRawStatus = process.env.COCKPIT_DEBUG_RAW_STATUS === '1'

  return {
    adapter: {
      name: 'claw-cockpit-local-adapter',
      schemaVersion: '2026-05-16.1',
      strategy: 'cli-and-local-state',
    },
    generatedAt: new Date().toISOString(),
    gateway: {
      state: probeText.includes('Reachable: yes') || statusText.includes('Gateway              │ local')
        ? 'healthy'
        : 'blocked',
      label: probeText.includes('Reachable: yes') ? 'OpenClaw is reachable' : 'Gateway needs help',
      detail: extractLine(probeText, 'Local loopback') || extractLine(statusText, 'Gateway') || 'No gateway signal yet.',
      url: 'ws://127.0.0.1:18789',
    },
    openclaw: {
      version: parseVersion(statusText),
      launchAgent: extractLine(statusText, 'Gateway service') || 'unknown',
      update: extractLine(statusText, 'Update') || 'unknown',
    },
    counts: {
      agents: agentTotal,
      jobs: jobSummaries.length,
      sessions: sessionTotal,
      warnings: setupWarnings,
      compatibilityWarnings,
      securityWarnings,
      riskSignals: setupWarnings + compatibilityWarnings,
    },
    checks,
    compatibility,
    agents,
    jobs: jobSummaries,
    sessions,
    rawStatus: debugRawStatus ? redactForClient(statusText) : undefined,
  }
}

async function runOpenClaw(args, timeout) {
  try {
    const { stdout, stderr } = await execFileAsync('openclaw', args, {
      timeout,
      maxBuffer: 1024 * 1024 * 3,
      env: process.env,
    })
    return { ok: true, stdout, stderr, error: '' }
  } catch (error) {
    return {
      ok: false,
      stdout: redactForClient(error?.stdout ?? ''),
      stderr: redactForClient(error?.stderr ?? ''),
      error: redactForClient(error instanceof Error ? error.message : String(error)),
    }
  }
}

async function readJsonFile(path, fallback) {
  try {
    return { ok: true, path, value: JSON.parse(await readFile(path, 'utf8')), error: '' }
  } catch (error) {
    return {
      ok: false,
      path,
      value: fallback,
    error: redactForClient(error instanceof Error ? error.message : String(error)),
    }
  }
}

function countConfiguredAgents(config, statusText) {
  if (Array.isArray(config?.agents?.list)) return config.agents.list.length

  const statusMatch = statusText.match(/Agents\s+│\s+(\d+)/)
  if (statusMatch) return Number.parseInt(statusMatch[1], 10)

  return 0
}

function countActiveSessions(statusText, fallback) {
  const statusMatch = statusText.match(/Sessions\s+│\s+(\d+)\s+active/)
  if (statusMatch) return Number.parseInt(statusMatch[1], 10)
  return fallback
}

function summarizeAgents(config) {
  const entries = Array.isArray(config?.agents?.list) ? config.agents.list : []
  return entries.slice(0, 80).map((agent) => {
    const model = typeof agent?.model === 'string' ? agent.model : agent?.model?.primary
    return {
      id: String(agent?.id ?? 'unknown'),
      name: String(agent?.name ?? agent?.id ?? 'Unnamed agent'),
      workspace: String(agent?.workspace ?? config?.agents?.defaults?.workspace ?? '~/.openclaw/workspace'),
      model: String(model ?? config?.agents?.defaults?.model?.primary ?? 'default'),
      heartbeat: agent?.heartbeat?.enabled === false ? 'disabled' : 'configured',
      status: 'configured',
    }
  })
}

function summarizeJobs(jobs) {
  const list = Array.isArray(jobs) ? jobs : Array.isArray(jobs?.jobs) ? jobs.jobs : []
  return list.slice(0, 24).map((job, index) => ({
    id: String(job?.id ?? job?.name ?? `job-${index + 1}`),
    title: String(job?.name ?? job?.title ?? job?.prompt ?? `OpenClaw job ${index + 1}`).slice(0, 80),
    schedule: String(job?.schedule ?? job?.rrule ?? job?.cron ?? 'schedule not labeled'),
    status: String(job?.status ?? 'configured'),
  }))
}

function summarizeSessions(stdout) {
  const rows = stdout
    .split('\n')
    .filter((line) => line.includes('│ agent:'))
    .map((line) =>
      line
        .split('│')
        .map((part) => part.trim())
        .filter(Boolean),
    )

  return rows.slice(0, 20).map((parts) => ({
    key: parts[0] ?? 'session',
    age: parts[2] ?? 'unknown',
    model: parts[3] ?? 'unknown',
    runtime: parts[4] ?? 'unknown',
    tokens: parts[5] ?? 'unknown',
  }))
}

function buildChecks({ status, probe, statusText, probeText, config }) {
  const checks = []
  const mainAgent = Array.isArray(config?.agents?.list)
    ? config.agents.list.find((agent) => agent?.id === 'main')
    : null
  const mainModel = typeof mainAgent?.model === 'string' ? mainAgent.model : mainAgent?.model?.primary

  checks.push({
    id: 'gateway',
    title: probeText.includes('Reachable: yes') ? 'OpenClaw is reachable' : 'Gateway is not answering',
    detail: probeText.includes('Reachable: yes')
      ? 'The local WebSocket gateway answered the cockpit probe.'
      : probe.error || 'Start or repair the OpenClaw gateway before running agents.',
    state: probeText.includes('Reachable: yes') ? 'healthy' : 'blocked',
    command: probeText.includes('Reachable: yes') ? undefined : 'openclaw gateway restart',
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

function buildCompatibility({
  status,
  probe,
  cliHelp,
  agentsHelp,
  cronHelp,
  statusText,
  probeText,
  configRead,
  jobsRead,
}) {
  const cliHelpText = `${cliHelp.stdout}\n${cliHelp.stderr}`.trim()
  const agentsHelpText = `${agentsHelp.stdout}\n${agentsHelp.stderr}`.trim()
  const cronHelpText = `${cronHelp.stdout}\n${cronHelp.stderr}`.trim()
  const requiredCommands = [
    'status',
    'doctor',
    'gateway',
    'agents',
    'cron',
    'plugins',
    'security',
    'models',
  ]
  const missingCommands = cliHelp.ok
    ? requiredCommands.filter((command) => !new RegExp(`\\b${command}\\b`).test(cliHelpText))
    : requiredCommands
  const securitySummary = parseSecuritySummary(statusText)
  const channel = parseTableValue(statusText, 'Channel')
  const update = parseTableValue(statusText, 'Update')
  const exposure = parseTableValue(statusText, 'Tailscale exposure')
  const pluginCompatibility = parseTableValue(statusText, 'Plugin compatibility')
  const unpinnedPlugins = statusText.includes('Plugin index includes unpinned npm specs')
  const allowInsecureAuth = statusText.includes('allowInsecureAuth=true')
  const hasAgentAdd = /\badd\b/.test(agentsHelpText)
  const hasCronAdd = /\badd\b/.test(cronHelpText)
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
        ? `${openclawConfigPath} parsed cleanly.`
        : `Could not parse ${openclawConfigPath}: ${configRead.error}`,
      state: configRead.ok ? 'healthy' : 'blocked',
      source: openclawConfigPath,
    },
    {
      id: 'jobs-state',
      title: jobsRead.ok ? 'Scheduled work registry is readable' : 'Scheduled work registry not found yet',
      detail: jobsRead.ok
        ? `${cronJobsPath} parsed cleanly.`
        : 'No local cron registry was found. That is okay if no scheduled work exists yet.',
      state: jobsRead.ok ? 'healthy' : 'unknown',
      source: cronJobsPath,
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
      title: probe.ok && probeText.includes('Reachable: yes') ? 'Gateway probe contract works' : 'Gateway probe contract changed',
      detail: probe.ok
        ? extractLine(probeText, 'Local loopback') || 'Gateway probe responded.'
        : probe.error || 'Gateway probe did not complete.',
      state: probe.ok && probeText.includes('Reachable: yes') ? 'healthy' : 'blocked',
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

function worstState(checks) {
  if (checks.some((check) => check.state === 'blocked')) return 'blocked'
  if (checks.some((check) => check.state === 'attention')) return 'attention'
  if (checks.some((check) => check.state === 'unknown')) return 'unknown'
  return 'healthy'
}

function sortChecksByRisk(checks) {
  const score = { blocked: 0, attention: 1, unknown: 2, healthy: 3 }
  return [...checks].sort((a, b) => score[a.state] - score[b.state] || a.title.localeCompare(b.title))
}

function parseSecuritySummary(text) {
  const match = text.match(/Summary:\s+(\d+)\s+critical\s+·\s+(\d+)\s+warn\s+·\s+(\d+)\s+info/)
  return {
    found: Boolean(match),
    critical: match ? Number.parseInt(match[1], 10) : 0,
    warn: match ? Number.parseInt(match[2], 10) : 0,
    info: match ? Number.parseInt(match[3], 10) : 0,
    total: match ? Number.parseInt(match[1], 10) + Number.parseInt(match[2], 10) + Number.parseInt(match[3], 10) : 0,
  }
}

function redactForClient(value) {
  return String(value)
    .replace(/(sk-[A-Za-z0-9_-]{12,})/g, '[redacted-api-key]')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi, '$1[redacted-token]')
    .replace(/(token(?:\\s+config)?[×:=\\s-]*)([A-Za-z0-9._~+/=-]{8,})/gi, '$1[redacted-token]')
    .replace(/(api[_-]?key\\s*[=:]\\s*)([^\\s│]+)/gi, '$1[redacted-api-key]')
    .replace(/(refresh[_-]?token\\s*[=:]\\s*)([^\\s│]+)/gi, '$1[redacted-token]')
    .replace(/-----BEGIN [^-]+PRIVATE KEY-----[\\s\\S]*?-----END [^-]+PRIVATE KEY-----/g, '[redacted-private-key]')
}

function parseTableValue(text, item) {
  const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = text.match(new RegExp(`│\\s*${escaped}\\s+│\\s*([^│\\n]+)`))
  return match?.[1]?.trim() ?? ''
}

function parseVersion(text) {
  const match = text.match(/app\s+([0-9][^\s│]+)/)
  return match?.[1] ?? 'unknown'
}

function extractLine(text, needle) {
  const line = text.split('\n').find((entry) => entry.includes(needle))
  if (!line) return ''
  return line
    .replace(/[│┌┐└┘├┤─┬┴┼]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(body))
}
