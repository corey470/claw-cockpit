import { redactForClient } from './redaction.mjs'
import { buildChecks, buildCompatibility } from './compatibilityScoring.mjs'
import {
  countActiveSessions,
  countConfiguredAgents,
  extractLine,
  parseVersion,
  summarizeAgents,
  summarizeJobs,
  summarizeSessions,
  textFrom,
} from './openclawParsers.mjs'

export function buildOverview({ sources, paths, env }) {
  const { status, probe, configRead, jobsRead } = sources
  const config = configRead.value
  const jobs = jobsRead.value
  const statusText = textFrom(status)
  const probeText = textFrom(probe)
  const agents = summarizeAgents(config)
  const jobSummaries = summarizeJobs(jobs)
  const sessions = summarizeSessions(status.stdout)
  const checks = buildChecks({ status, probe, statusText, probeText, config })
  const compatibility = buildCompatibility({ sources, statusText, probeText, paths })
  const setupWarnings = checks.filter((check) => check.state === 'attention' || check.state === 'blocked').length
  const compatibilityWarnings = compatibility.checks.filter(
    (check) => check.state === 'attention' || check.state === 'blocked',
  ).length
  const securityWarnings = compatibility.signals.security.warn + compatibility.signals.security.critical
  const agentTotal = countConfiguredAgents(config, statusText)
  const sessionTotal = countActiveSessions(statusText, sessions.length)
  const debugRawStatus = env.COCKPIT_DEBUG_RAW_STATUS === '1'

  return {
    adapter: {
      name: 'claw-cockpit-local-adapter',
      schemaVersion: '2026-05-16.1',
      strategy: env.COCKPIT_FIXTURE_DIR ? 'fixture-cli-and-local-state' : 'cli-and-local-state',
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
