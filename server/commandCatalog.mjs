import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { redactForClient } from './redaction.mjs'

const execFileAsync = promisify(execFile)

export const commandCatalog = {
  'agent.add': {
    title: 'Create OpenClaw helper',
    description: 'Adds one OpenClaw helper for a specific local workspace.',
  },
  'cron.add': {
    title: 'Create OpenClaw reminder',
    description: 'Adds one scheduled OpenClaw reminder for an existing helper.',
  },
  'gateway.restart': {
    title: 'Restart OpenClaw gateway',
    description: 'Restarts the local OpenClaw gateway when the control surface is not reachable.',
  },
  'security.audit.deep': {
    title: 'Run deep security audit',
    description: 'Runs the OpenClaw security audit so warnings can be reviewed from current source truth.',
  },
}

export function buildCommandDraft(commandId, params = {}) {
  if (commandId === 'agent.add') return buildAgentAdd(params)
  if (commandId === 'cron.add') return buildCronAdd(params)
  if (commandId === 'gateway.restart') return buildGatewayRestart()
  if (commandId === 'security.audit.deep') return buildSecurityAuditDeep()
  throw new Error(`Unsupported command id: ${commandId}`)
}

export async function runCatalogCommand({ commandId, params, confirm, paths, env, dryRun = false }) {
  if (confirm !== 'RUN') throw new Error('Type RUN to confirm this reviewed command.')
  const draft = buildCommandDraft(commandId, params)
  const startedAt = new Date().toISOString()

  if (dryRun || env.COCKPIT_FIXTURE_DIR || env.COCKPIT_EXECUTION_MODE === 'dry-run') {
    const dryRunResult = {
      ok: true,
      dryRun: true,
      commandId,
      preview: draft.preview,
      startedAt,
      finishedAt: new Date().toISOString(),
      stdout: 'Dry run: command validated but not executed.',
      stderr: '',
    }
    await appendAudit(paths, dryRunResult)
    return dryRunResult
  }

  try {
    const { stdout, stderr } = await execFileAsync('openclaw', draft.args, {
      timeout: 30_000,
      maxBuffer: 1024 * 1024 * 2,
      env,
    })
    const result = {
      ok: true,
      dryRun: false,
      commandId,
      preview: draft.preview,
      startedAt,
      finishedAt: new Date().toISOString(),
      stdout: redactForClient(stdout),
      stderr: redactForClient(stderr),
    }
    await appendAudit(paths, result)
    return result
  } catch (error) {
    const result = {
      ok: false,
      dryRun: false,
      commandId,
      preview: draft.preview,
      startedAt,
      finishedAt: new Date().toISOString(),
      stdout: redactForClient(error?.stdout ?? ''),
      stderr: redactForClient(error?.stderr ?? ''),
      error: redactForClient(error instanceof Error ? error.message : String(error)),
    }
    await appendAudit(paths, result)
    return result
  }
}

export async function readAuditLog(paths) {
  try {
    const text = await readFile(auditPath(paths), 'utf8')
    return text
      .split('\n')
      .filter(Boolean)
      .slice(-25)
      .map((line) => JSON.parse(line))
      .reverse()
  } catch {
    return []
  }
}

function buildAgentAdd(params) {
  const helperName = validateSlug(params.helperName, 'Helper name')
  const workspace = validateWorkspace(params.workspace)
  const args = ['agents', 'add', helperName, '--workspace', workspace, '--non-interactive']
  return {
    commandId: 'agent.add',
    args,
    preview: `openclaw ${args.map(quoteArg).join(' ')}`,
  }
}

function buildCronAdd(params) {
  const reminderName = validatePlainText(params.reminderName, 'Reminder name', 80)
  const agent = validateSlug(params.agent || 'main', 'Agent')
  const message = validatePlainText(params.message, 'Reminder message', 240)
  const cron = validateCron(params.cron)
  const timezone = validateTimezone(params.timezone || 'America/New_York')
  const args = [
    'cron',
    'add',
    '--name',
    reminderName,
    '--agent',
    agent,
    '--message',
    message,
    '--cron',
    cron,
    '--tz',
    timezone,
  ]
  return {
    commandId: 'cron.add',
    args,
    preview: `openclaw ${args.map(quoteArg).join(' ')}`,
  }
}

function buildGatewayRestart() {
  const args = ['gateway', 'restart']
  return {
    commandId: 'gateway.restart',
    args,
    preview: `openclaw ${args.map(quoteArg).join(' ')}`,
  }
}

function buildSecurityAuditDeep() {
  const args = ['security', 'audit', '--deep']
  return {
    commandId: 'security.audit.deep',
    args,
    preview: `openclaw ${args.map(quoteArg).join(' ')}`,
  }
}

function validateSlug(value, label) {
  const text = String(value ?? '').trim()
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(text)) {
    throw new Error(`${label} must use lowercase letters, numbers, and dashes.`)
  }
  return text
}

function validateWorkspace(value) {
  const text = String(value ?? '').trim()
  if (!text.startsWith('/') || text.includes('\n') || text.length > 240 || text === '/path/to/repo') {
    throw new Error('Workspace must be a local absolute path.')
  }
  return text
}

function validatePlainText(value, label, maxLength) {
  const text = String(value ?? '').trim()
  if (text.length < 3 || text.length > maxLength || /[\r\n]/.test(text)) {
    throw new Error(`${label} must be plain text between 3 and ${maxLength} characters.`)
  }
  return text
}

function validateCron(value) {
  const text = String(value ?? '').trim()
  if (!/^[0-9*,/\-\s]{9,80}$/.test(text) || text.split(/\s+/).length !== 5) {
    throw new Error('Cron must be a standard five-part cron expression.')
  }
  return text
}

function validateTimezone(value) {
  const text = String(value ?? '').trim()
  if (!/^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/.test(text)) {
    throw new Error('Timezone must look like America/New_York.')
  }
  return text
}

function quoteArg(value) {
  const text = String(value)
  return /^[A-Za-z0-9_./:-]+$/.test(text) ? text : JSON.stringify(text)
}

async function appendAudit(paths, result) {
  const path = auditPath(paths)
  await mkdir(dirname(path), { recursive: true })
  const previous = await readFile(path, 'utf8').catch(() => '')
  await writeFile(path, `${previous}${JSON.stringify(result)}\n`)
}

function auditPath(paths) {
  return join(paths.openclawHome, 'claw-cockpit', 'runs.jsonl')
}
