import {
  parseSecuritySummary,
  parseTableValue,
  parseVersion,
  sortChecksByRisk,
  textFrom,
  worstState,
} from './openclawParsers.mjs'

export function buildContractReport({ sources, paths, statusText, probeText }) {
  const cliHelpText = textFrom(sources.cliHelp)
  const agentsHelpText = textFrom(sources.agentsHelp)
  const cronHelpText = textFrom(sources.cronHelp)
  const config = sources.configRead.value
  const jobs = sources.jobsRead.value
  const requiredCommands = ['status', 'doctor', 'gateway', 'agents', 'cron', 'plugins', 'security', 'models']
  const missingCommands = requiredCommands.filter((command) => !new RegExp(`\\b${command}\\b`).test(cliHelpText))
  const statusShapeSignals = ['Overview', 'Gateway', 'Gateway service', 'Security audit', 'Sessions']
  const missingStatusSignals = statusShapeSignals.filter((signal) => !statusText.includes(signal))
  const agentList = Array.isArray(config?.agents?.list) ? config.agents.list : []
  const jobsList = Array.isArray(jobs) ? jobs : Array.isArray(jobs?.jobs) ? jobs.jobs : []
  const security = parseSecuritySummary(statusText)

  const checks = sortChecksByRisk([
    contractCheck({
      id: 'cli-core',
      title: missingCommands.length === 0 ? 'Core CLI commands are present' : 'Core CLI commands moved',
      detail: missingCommands.length === 0
        ? 'OpenClaw still exposes the commands Cockpit depends on.'
        : `Missing commands: ${missingCommands.join(', ')}.`,
      state: missingCommands.length === 0 ? 'healthy' : 'blocked',
      source: 'openclaw --help',
      expected: requiredCommands.join(', '),
      observed: missingCommands.length === 0 ? 'all present' : missingCommands.join(', '),
    }),
    contractCheck({
      id: 'status-shape',
      title: missingStatusSignals.length === 0 ? 'Deep status shape is readable' : 'Deep status shape changed',
      detail: missingStatusSignals.length === 0
        ? 'Status output still contains overview, gateway, audit, and session sections.'
        : `Missing sections: ${missingStatusSignals.join(', ')}.`,
      state: missingStatusSignals.length === 0 ? 'healthy' : 'attention',
      source: 'openclaw status --deep',
      expected: statusShapeSignals.join(', '),
      observed: missingStatusSignals.length === 0 ? 'expected sections found' : missingStatusSignals.join(', '),
    }),
    contractCheck({
      id: 'version-signal',
      title: parseVersion(statusText) !== 'unknown' ? 'Version signal is visible' : 'Version signal disappeared',
      detail: parseVersion(statusText) !== 'unknown'
        ? `Local OpenClaw version is ${parseVersion(statusText)}.`
        : 'Cockpit could not read the app version from status output.',
      state: parseVersion(statusText) !== 'unknown' ? 'healthy' : 'attention',
      source: 'openclaw status --deep',
      expected: 'app version in overview',
      observed: parseVersion(statusText),
    }),
    contractCheck({
      id: 'gateway-probe',
      title: probeText.includes('Reachable: yes') ? 'Gateway probe still works' : 'Gateway probe contract changed',
      detail: probeText.includes('Reachable: yes')
        ? 'The local gateway probe returns the expected reachable signal.'
        : sources.probe.error || 'The probe did not return Reachable: yes.',
      state: probeText.includes('Reachable: yes') ? 'healthy' : 'blocked',
      source: 'openclaw gateway probe',
      expected: 'Reachable: yes',
      observed: probeText.slice(0, 160) || sources.probe.error,
    }),
    contractCheck({
      id: 'setup-command-surface',
      title: /\badd\b/.test(agentsHelpText) && /\badd\b/.test(cronHelpText)
        ? 'Setup commands are still mappable'
        : 'Setup command surface changed',
      detail: /\badd\b/.test(agentsHelpText) && /\badd\b/.test(cronHelpText)
        ? 'Cockpit can still draft helper and reminder setup commands.'
        : 'OpenClaw may have renamed agents add or cron add.',
      state: /\badd\b/.test(agentsHelpText) && /\badd\b/.test(cronHelpText) ? 'healthy' : 'blocked',
      source: 'openclaw agents --help / openclaw cron --help',
      expected: 'agents add, cron add',
      observed: `agents add=${/\badd\b/.test(agentsHelpText)}, cron add=${/\badd\b/.test(cronHelpText)}`,
    }),
    contractCheck({
      id: 'config-agents',
      title: agentList.length > 0 ? 'Agent config shape is readable' : 'Agent config shape needs review',
      detail: agentList.length > 0
        ? `${agentList.length} configured agents were found in ${paths.openclawConfigPath}.`
        : 'Cockpit could not find agents.list in the local config.',
      state: agentList.length > 0 ? 'healthy' : 'attention',
      source: paths.openclawConfigPath,
      expected: 'agents.list[]',
      observed: agentList.length > 0 ? `${agentList.length} agents` : 'not found',
    }),
    contractCheck({
      id: 'cron-registry',
      title: sources.jobsRead.ok ? 'Cron registry is readable' : 'Cron registry is optional or moved',
      detail: sources.jobsRead.ok
        ? `${jobsList.length} scheduled jobs were read.`
        : 'No cron registry was found. That is okay only if this OpenClaw instance has no scheduled work.',
      state: sources.jobsRead.ok ? 'healthy' : 'unknown',
      source: paths.cronJobsPath,
      expected: 'cron/jobs.json or no jobs configured',
      observed: sources.jobsRead.ok ? `${jobsList.length} jobs` : sources.jobsRead.error,
    }),
    contractCheck({
      id: 'security-summary',
      title: security.found ? 'Security summary is parseable' : 'Security summary changed',
      detail: security.found
        ? `${security.critical} critical, ${security.warn} warnings, ${security.info} info.`
        : 'Cockpit could not parse the security audit summary.',
      state: security.found ? 'healthy' : 'attention',
      source: 'openclaw status --deep',
      expected: 'Summary: N critical · N warn · N info',
      observed: security.found ? 'summary found' : 'not found',
    }),
    contractCheck({
      id: 'update-signal',
      title: parseTableValue(statusText, 'Update') ? 'Update signal is visible' : 'Update signal changed',
      detail: parseTableValue(statusText, 'Update') || 'Cockpit could not read OpenClaw update state.',
      state: parseTableValue(statusText, 'Update') ? 'healthy' : 'attention',
      source: 'openclaw status --deep',
      expected: 'Update row',
      observed: parseTableValue(statusText, 'Update') || 'not found',
    }),
  ])

  const posture = worstState(checks)
  return {
    generatedAt: new Date().toISOString(),
    contractVersion: '2026-06-18.1',
    posture,
    summary:
      posture === 'blocked'
        ? 'OpenClaw changed in a way Cockpit should not ignore.'
        : posture === 'attention'
          ? 'OpenClaw is usable, but the adapter should learn a newer shape.'
          : 'OpenClaw matches the current Cockpit compatibility contract.',
    checks,
  }
}

function contractCheck(check) {
  return {
    ...check,
    kind: 'contract',
  }
}
