export function textFrom(result) {
  return `${result.stdout}\n${result.stderr}`.trim()
}

export function countConfiguredAgents(config, statusText) {
  if (Array.isArray(config?.agents?.list)) return config.agents.list.length

  const statusMatch = statusText.match(/Agents\s+│\s+(\d+)/)
  if (statusMatch) return Number.parseInt(statusMatch[1], 10)

  return 0
}

export function countActiveSessions(statusText, fallback) {
  const statusMatch = statusText.match(/Sessions\s+│\s+(\d+)\s+active/)
  if (statusMatch) return Number.parseInt(statusMatch[1], 10)
  return fallback
}

export function summarizeAgents(config) {
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

export function summarizeJobs(jobs) {
  const list = Array.isArray(jobs) ? jobs : Array.isArray(jobs?.jobs) ? jobs.jobs : []
  return list.slice(0, 24).map((job, index) => ({
    id: String(job?.id ?? job?.name ?? `job-${index + 1}`),
    title: String(job?.name ?? job?.title ?? job?.prompt ?? `OpenClaw job ${index + 1}`).slice(0, 80),
    schedule: String(job?.schedule ?? job?.rrule ?? job?.cron ?? 'schedule not labeled'),
    status: String(job?.status ?? 'configured'),
  }))
}

export function summarizeSessions(stdout) {
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

export function parseSecuritySummary(text) {
  const match = text.match(/Summary:\s+(\d+)\s+critical\s+·\s+(\d+)\s+warn\s+·\s+(\d+)\s+info/)
  return {
    found: Boolean(match),
    critical: match ? Number.parseInt(match[1], 10) : 0,
    warn: match ? Number.parseInt(match[2], 10) : 0,
    info: match ? Number.parseInt(match[3], 10) : 0,
    total: match ? Number.parseInt(match[1], 10) + Number.parseInt(match[2], 10) + Number.parseInt(match[3], 10) : 0,
  }
}

export function parseTableValue(text, item) {
  const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = text.match(new RegExp(`│\\s*${escaped}\\s+│\\s*([^│\\n]+)`))
  return match?.[1]?.trim() ?? ''
}

export function parseVersion(text) {
  const match = text.match(/app\s+([0-9][^\s│]+)/)
  return match?.[1] ?? 'unknown'
}

export function extractLine(text, needle) {
  const line = text.split('\n').find((entry) => entry.includes(needle))
  if (!line) return ''
  return line
    .replace(/[│┌┐└┘├┤─┬┴┼]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sortChecksByRisk(checks) {
  const score = { blocked: 0, attention: 1, unknown: 2, healthy: 3 }
  return [...checks].sort((a, b) => score[a.state] - score[b.state] || a.title.localeCompare(b.title))
}

export function worstState(checks) {
  if (checks.some((check) => check.state === 'blocked')) return 'blocked'
  if (checks.some((check) => check.state === 'attention')) return 'attention'
  if (checks.some((check) => check.state === 'unknown')) return 'unknown'
  return 'healthy'
}
