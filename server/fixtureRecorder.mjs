import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { textFrom } from './openclawParsers.mjs'
import { redactForClient, redactJsonForClient } from './redaction.mjs'

export async function recordFixture({ sources, paths, confirm, env }) {
  if (confirm !== 'RECORD') throw new Error('Type RECORD to save a redacted OpenClaw fixture.')

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const root = env.COCKPIT_RECORDED_FIXTURE_DIR || join(paths.openclawHome, 'claw-cockpit', 'recorded-fixtures')
  const target = join(root, timestamp)
  await mkdir(target, { recursive: true })

  const files = [
    writeText(target, 'status.txt', textFrom(sources.status)),
    writeText(target, 'gateway-probe.txt', textFrom(sources.probe)),
    writeText(target, 'openclaw-help.txt', textFrom(sources.cliHelp)),
    writeText(target, 'agents-help.txt', textFrom(sources.agentsHelp)),
    writeText(target, 'cron-help.txt', textFrom(sources.cronHelp)),
    writeJson(target, 'openclaw.json', sources.configRead.value),
    writeJson(target, 'jobs.json', sources.jobsRead.value),
    writeJson(target, 'metadata.json', {
      recordedAt: new Date().toISOString(),
      source: 'claw-cockpit fixture recorder',
      note: 'Redacted local OpenClaw output. Review before copying into repo fixtures.',
      statusOk: sources.status.ok,
      probeOk: sources.probe.ok,
      configPath: sources.configRead.path,
      jobsPath: sources.jobsRead.path,
    }),
  ]

  const written = await Promise.all(files)
  return {
    ok: true,
    path: target,
    files: written,
    savedAt: new Date().toISOString(),
    message: 'Recorded a redacted OpenClaw fixture. Review it before copying into committed fixtures.',
  }
}

async function writeText(target, name, value) {
  const path = join(target, name)
  await writeFile(path, redactForClient(value), 'utf8')
  return path
}

async function writeJson(target, name, value) {
  const path = join(target, name)
  const redacted = JSON.stringify(redactJsonForClient(value), null, 2)
  await writeFile(path, `${redacted}\n`, 'utf8')
  return path
}
