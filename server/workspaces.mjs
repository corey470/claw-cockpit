import { readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'

export async function buildWorkspaceSuggestions({ paths, cwd = process.cwd() }) {
  const candidates = [
    cwd,
    join(homedir(), 'Documents'),
    join(homedir(), 'Documents', 'Claw Cockpit', 'claw-cockpit'),
    join(homedir(), 'Documents', 'Claw Cockpit', 'openclaw-control-center'),
    join(homedir(), 'Documents', 'Irie-commerce'),
    join(homedir(), 'Documents', 'irie-suite'),
    join(homedir(), 'Documents', 'vision-website-builder'),
  ]
  const documentRepos = await findDocumentRepos(join(homedir(), 'Documents'))
  const agentWorkspaces = await readAgentWorkspaces(paths)
  const merged = [...candidates, ...documentRepos, ...agentWorkspaces]
  const seen = new Set()
  const workspaces = []

  for (const path of merged) {
    if (!path || seen.has(path)) continue
    seen.add(path)
    const exists = await isDirectory(path)
    if (!exists) continue
    workspaces.push({
      name: labelFor(path),
      path,
      kind: path.includes('/.openclaw/') ? 'OpenClaw helper' : path.includes('/Documents/') ? 'Documents project' : 'Local folder',
    })
    if (workspaces.length >= 18) break
  }

  return {
    generatedAt: new Date().toISOString(),
    workspaces,
  }
}

async function findDocumentRepos(documentsPath) {
  try {
    const entries = await readdir(documentsPath, { withFileTypes: true })
    const folders = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).slice(0, 80)
    const checks = await Promise.all(
      folders.map(async (entry) => {
        const path = join(documentsPath, entry.name)
        return (await isDirectory(join(path, '.git'))) && (await hasVisibleProjectFiles(path)) ? path : ''
      }),
    )
    return checks.filter(Boolean)
  } catch {
    return []
  }
}

async function readAgentWorkspaces(paths) {
  try {
    const text = await import('node:fs/promises').then(({ readFile }) => readFile(paths.openclawConfigPath, 'utf8'))
    const config = JSON.parse(text)
    const agents = Array.isArray(config?.agents?.list) ? config.agents.list : []
    return agents.map((agent) => String(agent?.workspace ?? '')).filter((path) => path.startsWith('/'))
  } catch {
    return []
  }
}

async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

async function hasVisibleProjectFiles(path) {
  try {
    const entries = await readdir(path, { withFileTypes: true })
    return entries.some((entry) => !entry.name.startsWith('.') && entry.name !== 'node_modules')
  } catch {
    return false
  }
}

function labelFor(path) {
  return basename(path) || path
}
