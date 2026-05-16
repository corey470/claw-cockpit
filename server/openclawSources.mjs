import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { redactForClient } from './redaction.mjs'

const execFileAsync = promisify(execFile)

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

  const [status, probe, configRead, jobsRead, cliHelp, agentsHelp, cronHelp] = await Promise.all([
    runOpenClaw(['status', '--deep'], 12_000, env),
    runOpenClaw(['gateway', 'probe'], 6_000, env),
    readJsonFile(paths.openclawConfigPath, {}),
    readJsonFile(paths.cronJobsPath, []),
    runOpenClaw(['--help'], 6_000, env),
    runOpenClaw(['agents', '--help'], 6_000, env),
    runOpenClaw(['cron', '--help'], 6_000, env),
  ])

  return { status, probe, configRead, jobsRead, cliHelp, agentsHelp, cronHelp }
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
