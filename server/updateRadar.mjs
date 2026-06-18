import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { parseTableValue, parseVersion } from './openclawParsers.mjs'
import { redactForClient } from './redaction.mjs'

const execFileAsync = promisify(execFile)

export function openClawRepoConfig(env) {
  return {
    upstreamRepo: env.OPENCLAW_UPSTREAM_REPO || '',
    forkRepo: env.OPENCLAW_FORK_REPO || '',
    localRepo: env.OPENCLAW_LOCAL_REPO || '',
  }
}

export async function buildUpdateRadar({ env, fixtureDir, statusText }) {
  if (fixtureDir) {
    const fixture = await readRadarFixture(fixtureDir)
    if (fixture) return fixture
  }

  const config = openClawRepoConfig(env)
  const local = {
    version: parseVersion(statusText),
    channel: parseTableValue(statusText, 'Channel') || 'unknown',
    update: parseTableValue(statusText, 'Update') || 'unknown',
    source: 'openclaw status --deep',
  }

  const repos = await Promise.all([
    inspectRemoteRepo('upstream', config.upstreamRepo, env),
    inspectRemoteRepo('fork', config.forkRepo, env),
    inspectLocalRepo(config.localRepo, env),
  ])

  const configuredRepos = repos.filter((repo) => repo.configured)
  const updateAvailable = /available/i.test(local.update)
  const blockedRepo = configuredRepos.find((repo) => repo.state === 'blocked')
  const attentionRepo = configuredRepos.find((repo) => repo.state === 'attention')
  const newestConfiguredTag = newestTag(configuredRepos.map((repo) => repo.latestTag).filter(Boolean))
  const repoAhead = newestConfiguredTag && compareVersions(newestConfiguredTag, local.version) > 0

  let posture = 'healthy'
  let title = 'OpenClaw source signals look steady'
  let detail = 'Cockpit can use the local CLI status as the current source truth.'
  let nextStep = 'Run the compatibility contract before changing OpenClaw.'

  if (blockedRepo) {
    posture = 'attention'
    title = 'Configured OpenClaw repo needs review'
    detail = `${blockedRepo.label}: ${blockedRepo.detail}`
    nextStep = 'Check the repo URL or local path before trusting upstream comparisons.'
  } else if (updateAvailable || repoAhead) {
    posture = 'attention'
    title = 'OpenClaw update is available'
    detail = repoAhead
      ? `Configured repo tag ${newestConfiguredTag} appears newer than local ${local.version}.`
      : local.update
    nextStep = 'Review the contract report, record a fixture if output changed, then update OpenClaw intentionally.'
  } else if (attentionRepo) {
    posture = 'attention'
    title = 'OpenClaw repo source is partially configured'
    detail = attentionRepo.detail
    nextStep = 'Add the missing fork/upstream setting when you want repo-aware drift checks.'
  } else if (configuredRepos.length === 0) {
    posture = 'unknown'
    title = 'OpenClaw repo source is not configured'
    detail = 'Set OPENCLAW_UPSTREAM_REPO, OPENCLAW_FORK_REPO, or OPENCLAW_LOCAL_REPO to compare against a fork.'
    nextStep = 'Cockpit will still use the local OpenClaw CLI update signal until repo settings are added.'
  }

  return {
    generatedAt: new Date().toISOString(),
    local,
    repos,
    recommendation: {
      state: posture,
      title,
      detail,
      nextStep,
    },
    configured: configuredRepos.length > 0,
    updateAvailable: updateAvailable || Boolean(repoAhead),
    newestConfiguredTag: newestConfiguredTag || '',
  }
}

async function inspectRemoteRepo(role, repoUrl, env) {
  const label = role === 'upstream' ? 'OpenClaw upstream' : 'OpenClaw fork'
  if (!repoUrl) {
    return {
      role,
      label,
      configured: false,
      state: 'unknown',
      url: '',
      latestTag: '',
      head: '',
      detail: `${label} is not configured.`,
    }
  }

  if (env.COCKPIT_DISABLE_NETWORK === '1') {
    return {
      role,
      label,
      configured: true,
      state: 'unknown',
      url: repoUrl,
      latestTag: '',
      head: '',
      detail: 'Network checks are disabled for this environment.',
    }
  }

  try {
    const [tags, head] = await Promise.all([
      execFileAsync('git', ['ls-remote', '--tags', '--refs', repoUrl], { timeout: 8_000, maxBuffer: 1024 * 1024, env }),
      execFileAsync('git', ['ls-remote', repoUrl, 'HEAD'], { timeout: 8_000, maxBuffer: 1024 * 256, env }),
    ])
    const latestTag = newestTag(
      tags.stdout
        .split('\n')
        .map((line) => line.match(/refs\/tags\/(.+)$/)?.[1] ?? '')
        .filter(Boolean),
    )
    return {
      role,
      label,
      configured: true,
      state: latestTag ? 'healthy' : 'attention',
      url: repoUrl,
      latestTag: latestTag || '',
      head: head.stdout.trim().split(/\s+/)[0]?.slice(0, 12) ?? '',
      detail: latestTag ? `Latest tag found: ${latestTag}.` : 'Remote is reachable, but no version tags were found.',
    }
  } catch (error) {
    return {
      role,
      label,
      configured: true,
      state: 'blocked',
      url: repoUrl,
      latestTag: '',
      head: '',
      detail: redactForClient(error instanceof Error ? error.message : String(error)),
    }
  }
}

async function inspectLocalRepo(localRepo, env) {
  if (!localRepo) {
    return {
      role: 'local',
      label: 'Local OpenClaw repo',
      configured: false,
      state: 'unknown',
      url: '',
      latestTag: '',
      head: '',
      detail: 'OPENCLAW_LOCAL_REPO is not configured.',
    }
  }

  try {
    const [head, status, tag] = await Promise.all([
      execFileAsync('git', ['-C', localRepo, 'rev-parse', '--short=12', 'HEAD'], { timeout: 4_000, env }),
      execFileAsync('git', ['-C', localRepo, 'status', '--short'], { timeout: 4_000, env }),
      execFileAsync('git', ['-C', localRepo, 'describe', '--tags', '--abbrev=0'], { timeout: 4_000, env }).catch(() => ({
        stdout: '',
        stderr: '',
      })),
    ])
    const dirty = status.stdout.trim().length > 0
    return {
      role: 'local',
      label: 'Local OpenClaw repo',
      configured: true,
      state: dirty ? 'attention' : 'healthy',
      url: localRepo,
      latestTag: tag.stdout.trim(),
      head: head.stdout.trim(),
      detail: dirty ? 'Local OpenClaw repo has uncommitted work.' : 'Local OpenClaw repo is readable and clean.',
    }
  } catch (error) {
    return {
      role: 'local',
      label: 'Local OpenClaw repo',
      configured: true,
      state: 'blocked',
      url: localRepo,
      latestTag: '',
      head: '',
      detail: redactForClient(error instanceof Error ? error.message : String(error)),
    }
  }
}

async function readRadarFixture(fixtureDir) {
  try {
    return JSON.parse(await readFile(join(fixtureDir, 'update-radar.json'), 'utf8'))
  } catch {
    return null
  }
}

function newestTag(tags) {
  return [...tags].sort((a, b) => compareVersions(b, a)).at(0) ?? ''
}

function compareVersions(a, b) {
  const left = versionParts(a)
  const right = versionParts(b)
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0)
    if (diff !== 0) return diff
  }
  return String(a).localeCompare(String(b))
}

function versionParts(value) {
  return String(value)
    .replace(/^v/i, '')
    .match(/\d+/g)
    ?.slice(0, 4)
    .map((part) => Number.parseInt(part, 10)) ?? [0]
}
