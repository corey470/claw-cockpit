import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { redactForClient } from './redaction.mjs'

const execFileAsync = promisify(execFile)
const LIVE_SOURCE_CACHE_MS = 2_000
let liveSourcesCache = null
let liveSourcesPromise = null

export function defaultOpenClawPaths(env) {
  const openclawHome = env.OPENCLAW_HOME || join(homedir(), '.openclaw')
  return {
    openclawHome,
    openclawConfigPath: env.OPENCLAW_CONFIG_PATH || join(openclawHome, 'openclaw.json'),
    cronJobsPath: join(openclawHome, 'cron', 'jobs.json'),
  }
}

export async function readOpenClawSources({ env, fixtureDir, paths }) {
  if (fixtureDir) return readFixtureSources(fixtureDir, paths)
  if (liveSourcesCache && Date.now() - liveSourcesCache.createdAt < LIVE_SOURCE_CACHE_MS) return liveSourcesCache.value
  if (liveSourcesPromise) return liveSourcesPromise

  liveSourcesPromise = readLiveOpenClawSources({ env, paths })
    .then((value) => {
      liveSourcesCache = { createdAt: Date.now(), value }
      return value
    })
    .finally(() => {
      liveSourcesPromise = null
    })

  return liveSourcesPromise
}

async function readLiveOpenClawSources({ env, paths }) {
  const [status, probe, configRead, jobsRead, cliHelp, agentsHelp, cronHelp] = await Promise.all([
    runOpenClaw(['status', '--deep'], 12_000, env),
    runOpenClaw(['gateway', 'probe'], 12_000, env),
    readJsonFile(paths.openclawConfigPath, {}),
    readJsonFile(paths.cronJobsPath, []),
    runOpenClaw(['--help'], 14_000, env),
    runOpenClaw(['agents', '--help'], 14_000, env),
    runOpenClaw(['cron', '--help'], 14_000, env),
  ])

  return {
    status,
    probe,
    configRead,
    jobsRead,
    cliHelp,
    agentsHelp,
    cronHelp,
    commandHelp: {
      status: helpFromRoot(cliHelp, 'status'),
      doctor: helpFromRoot(cliHelp, 'doctor'),
      gateway: helpFromRoot(cliHelp, 'gateway'),
      agents: agentsHelp,
      cron: cronHelp,
      plugins: helpFromRoot(cliHelp, 'plugins'),
      security: helpFromRoot(cliHelp, 'security'),
      models: helpFromRoot(cliHelp, 'models'),
    },
  }
}

function helpFromRoot(cliHelp, command) {
  const found = cliHelp.ok && new RegExp(`\\b${command}\\b`).test(cliHelp.stdout)
  return {
    ok: Boolean(found),
    stdout: found ? `Root help includes ${command}` : '',
    stderr: '',
    error: found ? '' : `Root help did not include ${command}`,
  }
}

async function readFixtureSources(fixtureDir, paths) {
  const [status, probe, configRead, jobsRead, cliHelp, agentsHelp, cronHelp] = await Promise.all([
    readTextFixture(fixtureDir, 'status.txt'),
    readTextFixture(fixtureDir, 'gateway-probe.txt'),
    readJsonFile(join(fixtureDir, 'openclaw.json'), {}),
    readJsonFile(join(fixtureDir, 'jobs.json'), []),
    readTextFixture(fixtureDir, 'openclaw-help.txt'),
    readTextFixture(fixtureDir, 'agents-help.txt'),
    readTextFixture(fixtureDir, 'cron-help.txt'),
  ])

  return {
    status,
    probe,
    configRead: { ...configRead, path: paths.openclawConfigPath },
    jobsRead: { ...jobsRead, path: paths.cronJobsPath },
    cliHelp,
    agentsHelp,
    cronHelp,
    commandHelp: {
      status: { ok: true, stdout: 'Usage: openclaw status', stderr: '', error: '' },
      doctor: { ok: true, stdout: 'Usage: openclaw doctor', stderr: '', error: '' },
      gateway: { ok: true, stdout: 'Usage: openclaw gateway', stderr: '', error: '' },
      agents: agentsHelp,
      cron: cronHelp,
      plugins: { ok: true, stdout: 'Usage: openclaw plugins', stderr: '', error: '' },
      security: { ok: true, stdout: 'Usage: openclaw security', stderr: '', error: '' },
      models: { ok: true, stdout: 'Usage: openclaw models', stderr: '', error: '' },
    },
  }
}

async function runOpenClaw(args, timeout, env) {
  try {
    const { stdout, stderr } = await execFileAsync('openclaw', args, {
      timeout,
      maxBuffer: 1024 * 1024 * 3,
      env,
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

async function readTextFixture(fixtureDir, name) {
  try {
    return { ok: true, stdout: await readFile(join(fixtureDir, name), 'utf8'), stderr: '', error: '' }
  } catch (error) {
    return {
      ok: false,
      stdout: '',
      stderr: '',
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
