import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'

export async function buildSkillWorkshop({ env, fixtureDir, paths }) {
  const roots = fixtureDir ? [join(fixtureDir, 'skills')] : skillRoots(env)
  const [skills, drafts] = await Promise.all([
    Promise.all(roots.map((root) => readSkillRoot(root))).then((items) => items.flat()),
    readSavedSkillDrafts(paths),
  ])
  const sorted = skills.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 300)
  const needsAttention = sorted.filter((skill) => skill.quality.state !== 'healthy').length
  const withExamples = sorted.filter((skill) => skill.quality.signals.includes('examples')).length
  const withScripts = sorted.filter((skill) => skill.quality.signals.includes('scripts')).length

  return {
    generatedAt: new Date().toISOString(),
    roots,
    counts: {
      skills: sorted.length,
      needsAttention,
      withExamples,
      withScripts,
      savedDrafts: drafts.length,
    },
    skills: sorted,
    drafts,
    draftRoot: paths ? skillDraftRoot(paths) : '',
    pluginReadiness: {
      state: sorted.length > 0 ? 'attention' : 'unknown',
      summary:
        sorted.length > 0
          ? 'Skills are available. Plugin packaging writes reviewed local files after preview.'
          : 'No skills were found in the scanned roots.',
      nextStep: 'Draft skills first, then save related skills as a reviewed plugin pack after the shape is stable.',
    },
  }
}

export function buildSkillDraft(params = {}) {
  const skillName = normalizeSkillName(params.skillName || 'new-openclaw-skill')
  const displayName = validatePlainText(params.displayName || titleFromSlug(skillName), 'Display name', 80)
  const goal = validatePlainText(params.goal, 'Goal', 260)
  const boundaries = validatePlainText(params.boundaries || 'Ask before changing files, running commands, or touching secrets.', 'Boundaries', 360)
  const example = validatePlainText(params.example || `Help me use ${displayName}.`, 'Example prompt', 180)
  const safeTitle = displayName.replaceAll('"', '\\"')

  const skillMd = `---\nname: ${skillName}\ndescription: Use when the user wants help with ${safeTitle}. Trigger when they ask to ${goal.toLowerCase()}.\n---\n\n# ${displayName}\n\n## What This Skill Helps With\n\n${goal}\n\n## Safe Boundaries\n\n${boundaries}\n\n## Workflow\n\n1. Restate the user's goal in plain English.\n2. Check the current repo, files, or tool state before suggesting changes.\n3. Draft the smallest useful next step.\n4. Show the user what will change before running commands or editing files.\n5. Verify the result and explain what happened in beginner-friendly language.\n\n## Example Prompt\n\n${example}\n`

  return {
    skillName,
    displayName,
    pathPreview: `~/.codex/skills/${skillName}/SKILL.md`,
    preview: skillMd,
    files: [
      {
        path: `${skillName}/SKILL.md`,
        contents: skillMd,
      },
    ],
    checks: [
      'Uses lowercase hyphen-case naming.',
      'Includes required name and description frontmatter.',
      'Saves to the Cockpit draft folder before any install step.',
    ],
  }
}

export async function saveSkillDraft({ params, confirm, paths }) {
  if (confirm !== 'SAVE') throw new Error('Type SAVE to confirm this reviewed skill draft.')
  const draft = buildSkillDraft(params)
  const root = skillDraftRoot(paths)
  const draftDir = join(root, draft.skillName)
  const skillPath = join(draftDir, 'SKILL.md')
  const metadataPath = join(draftDir, 'draft.json')
  const savedAt = new Date().toISOString()

  await mkdir(draftDir, { recursive: true })
  await writeFile(skillPath, draft.preview)
  await writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        skillName: draft.skillName,
        displayName: draft.displayName,
        savedAt,
        path: skillPath,
        installState: 'draft-only',
      },
      null,
      2,
    )}\n`,
  )

  return {
    ok: true,
    savedAt,
    skillName: draft.skillName,
    displayName: draft.displayName,
    path: skillPath,
    metadataPath,
    message: `Saved reviewed skill draft to ${skillPath}`,
  }
}

async function readSavedSkillDrafts(paths) {
  if (!paths) return []
  const root = skillDraftRoot(paths)
  try {
    const entries = await readdir(root, { withFileTypes: true })
    const drafts = await Promise.all(
      entries.filter((entry) => entry.isDirectory()).map((entry) => readSavedSkillDraft(join(root, entry.name))),
    )
    return drafts.filter(Boolean).sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, 50)
  } catch {
    return []
  }
}

async function readSavedSkillDraft(draftDir) {
  try {
    const metadata = JSON.parse(await readFile(join(draftDir, 'draft.json'), 'utf8'))
    return {
      skillName: metadata.skillName || basename(draftDir),
      displayName: metadata.displayName || titleFromSlug(metadata.skillName || basename(draftDir)),
      savedAt: metadata.savedAt || '',
      path: metadata.path || join(draftDir, 'SKILL.md'),
      installState: metadata.installState || 'draft-only',
      installedPath: metadata.installedPath || '',
    }
  } catch {
    return null
  }
}

export async function installSkillDraft({ skillName, confirm, paths, env }) {
  if (confirm !== 'INSTALL') throw new Error('Type INSTALL to confirm this saved skill draft.')
  const safeName = normalizeSkillName(skillName)
  const root = skillDraftRoot(paths)
  const draftDir = join(root, safeName)
  const skillPath = join(draftDir, 'SKILL.md')
  const metadataPath = join(draftDir, 'draft.json')
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
  const skillText = await readFile(skillPath, 'utf8')
  const targetRoot = env.COCKPIT_INSTALL_SKILL_DIR || join(homedir(), '.codex', 'skills')
  const targetDir = join(targetRoot, safeName)
  const targetPath = join(targetDir, 'SKILL.md')
  const installedAt = new Date().toISOString()

  await mkdir(targetDir, { recursive: true })
  const existing = await readFile(targetPath, 'utf8').catch(() => '')
  if (existing && existing !== skillText) {
    throw new Error('A different skill already exists at the install path. Review it before replacing anything.')
  }
  if (!existing) await copyFile(skillPath, targetPath)

  await writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        ...metadata,
        installState: 'installed',
        installedAt,
        installedPath: targetPath,
      },
      null,
      2,
    )}\n`,
  )

  return {
    ok: true,
    skillName: safeName,
    installedAt,
    path: targetPath,
    alreadyInstalled: Boolean(existing),
    message: existing ? `Skill was already installed at ${targetPath}` : `Installed skill to ${targetPath}`,
  }
}

export async function buildPluginPackDraft({ pluginName, displayName, skillNames = [] }, paths) {
  const pack = await buildPluginPack({ pluginName, displayName, skillNames }, paths)
  return {
    pluginName: pack.pluginName,
    displayName: pack.displayName,
    skillCount: pack.selectedDrafts.length,
    pathPreview: `~/.openclaw/claw-cockpit/plugin-packs/${pack.pluginName}`,
    preview: pluginPackPreview(pack),
  }
}

export async function savePluginPackDraft({ pluginName, displayName, skillNames = [], confirm, paths, env }) {
  if (confirm !== 'SAVE') throw new Error('Type SAVE to confirm this reviewed plugin pack.')
  const pack = await buildPluginPack({ pluginName, displayName, skillNames }, paths)
  const targetRoot = env.COCKPIT_PLUGIN_PACK_DIR || join(paths.openclawHome, 'claw-cockpit', 'plugin-packs')
  const pluginDir = join(targetRoot, pack.pluginName)
  const manifestPath = join(pluginDir, '.codex-plugin', 'plugin.json')
  const marketplacePath = join(pluginDir, 'marketplace-entry.json')
  const metadataPath = join(pluginDir, 'claw-cockpit-plugin-pack.json')
  const savedAt = new Date().toISOString()

  const files = [
    { path: manifestPath, contents: `${JSON.stringify(pack.manifest, null, 2)}\n` },
    { path: marketplacePath, contents: `${JSON.stringify(pack.marketplace, null, 2)}\n` },
    {
      path: metadataPath,
      allowUpdate: true,
      contents: `${JSON.stringify(
        {
          pluginName: pack.pluginName,
          displayName: pack.displayName,
          savedAt,
          skills: pack.selectedDrafts.map((draft) => ({
            skillName: draft.skillName,
            displayName: draft.displayName,
            sourcePath: draft.path,
          })),
        },
        null,
        2,
      )}\n`,
    },
    ...(await Promise.all(
      pack.selectedDrafts.map(async (draft) => ({
        path: join(pluginDir, 'skills', draft.skillName, 'SKILL.md'),
        contents: await readFile(join(skillDraftRoot(paths), draft.skillName, 'SKILL.md'), 'utf8'),
      })),
    )),
  ]

  for (const file of files) {
    const existing = await readFile(file.path, 'utf8').catch(() => '')
    if (existing && existing !== file.contents && !file.allowUpdate) {
      throw new Error(`A different file already exists at ${file.path}. Review it before replacing anything.`)
    }
  }

  for (const file of files) {
    await mkdir(dirname(file.path), { recursive: true })
    await writeFile(file.path, file.contents)
  }

  return {
    ok: true,
    pluginName: pack.pluginName,
    displayName: pack.displayName,
    skillCount: pack.selectedDrafts.length,
    savedAt,
    path: pluginDir,
    files: files.map((file) => file.path),
    message: `Saved plugin pack to ${pluginDir}`,
  }
}

async function buildPluginPack({ pluginName, displayName, skillNames = [] }, paths) {
  const safePluginName = normalizeSkillName(pluginName || 'claw-cockpit-skill-pack')
  const title = validatePlainText(displayName || titleFromSlug(safePluginName), 'Plugin display name', 80)
  const selectedNames = (Array.isArray(skillNames) ? skillNames : [])
    .map((name) => normalizeSkillName(name))
    .slice(0, 12)
  const drafts = await readSavedSkillDrafts(paths)
  const selectedDrafts = drafts.filter((draft) => selectedNames.includes(draft.skillName))
  if (selectedDrafts.length === 0) throw new Error('Choose at least one saved skill draft for the plugin pack.')

  const manifest = {
    name: safePluginName,
    interface: {
      displayName: title,
    },
    skills: selectedDrafts.map((draft) => `./skills/${draft.skillName}`),
    policy: {
      installation: 'AVAILABLE',
      authentication: 'ON_INSTALL',
    },
    category: 'Productivity',
  }
  const marketplace = {
    name: safePluginName,
    source: {
      source: 'local',
      path: `./plugins/${safePluginName}`,
    },
    policy: {
      installation: 'AVAILABLE',
      authentication: 'ON_INSTALL',
    },
    category: 'Productivity',
  }

  return {
    pluginName: safePluginName,
    displayName: title,
    selectedDrafts,
    manifest,
    marketplace,
  }
}

function pluginPackPreview(pack) {
  const preview = [
    `${pack.pluginName}/`,
    '  .codex-plugin/plugin.json',
    '  marketplace-entry.json',
    ...pack.selectedDrafts.map((draft) => `  skills/${draft.skillName}/SKILL.md`),
    '',
    '.codex-plugin/plugin.json',
    JSON.stringify(pack.manifest, null, 2),
    '',
    'marketplace-entry.json',
    JSON.stringify(pack.marketplace, null, 2),
    '',
    'Included skills',
    ...pack.selectedDrafts.map((draft) => `- ${draft.displayName}: ${draft.path}`),
  ].join('\n')

  return preview
}

function skillRoots(env) {
  if (env.COCKPIT_SKILL_DIRS) {
    return env.COCKPIT_SKILL_DIRS.split(':').map((root) => root.trim()).filter(Boolean)
  }
  return [join(homedir(), '.codex', 'skills'), join(homedir(), '.openclaw', 'skills')]
}

function skillDraftRoot(paths) {
  return join(paths.openclawHome, 'claw-cockpit', 'skill-drafts')
}

async function readSkillRoot(root) {
  try {
    const entries = await readdir(root, { withFileTypes: true })
    const skillDirs = entries.filter((entry) => entry.isDirectory())
    return (await Promise.all(skillDirs.map((entry) => readSkill(join(root, entry.name))))).filter(Boolean)
  } catch {
    return []
  }
}

async function readSkill(skillDir) {
  const skillPath = join(skillDir, 'SKILL.md')
  try {
    const text = await readFile(skillPath, 'utf8')
    const parsed = parseFrontmatter(text)
    const [scripts, references, assets, examples] = await Promise.all([
      directoryExists(join(skillDir, 'scripts')),
      directoryExists(join(skillDir, 'references')),
      directoryExists(join(skillDir, 'assets')),
      directoryExists(join(skillDir, 'examples')),
    ])
    const signals = [
      scripts ? 'scripts' : '',
      references ? 'references' : '',
      assets ? 'assets' : '',
      examples ? 'examples' : '',
    ].filter(Boolean)
    const quality = scoreSkill({ text, parsed, signals })

    return {
      id: basename(skillDir),
      name: parsed.name || basename(skillDir),
      title: titleFromSlug(parsed.name || basename(skillDir)),
      description: parsed.description || 'No trigger description found.',
      path: skillPath,
      root: dirname(skillDir),
      quality,
      signals,
    }
  } catch {
    return null
  }
}

async function directoryExists(path) {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/)
  const parsed = {}
  if (!match) return parsed
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':')
    if (!key || rest.length === 0) continue
    parsed[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '')
  }
  return parsed
}

function scoreSkill({ text, parsed, signals }) {
  const warnings = []
  if (!parsed.name) warnings.push('Missing skill name.')
  if (!parsed.description || parsed.description.length < 30) warnings.push('Description should clearly say when to use it.')
  if (text.length > 12_000) warnings.push('SKILL.md is long; move detail into references.')
  if (!/##\s+/i.test(text)) warnings.push('Add short sections so beginners can scan it.')

  if (warnings.length === 0) {
    return {
      state: 'healthy',
      label: 'Ready',
      summary:
        signals.length > 0
          ? 'Has clear trigger metadata and supporting structure.'
          : 'Has clear trigger metadata. Optional examples or references could make it easier to grow.',
      warnings,
      signals,
    }
  }

  return {
    state: warnings.length > 2 ? 'blocked' : 'attention',
    label: warnings.length > 2 ? 'Needs cleanup' : 'Improve',
    summary: warnings[0],
    warnings,
    signals,
  }
}

function normalizeSkillName(value) {
  const text = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(text)) {
    throw new Error('Skill name must use lowercase letters, numbers, and dashes.')
  }
  return text
}

function validatePlainText(value, label, maxLength) {
  const text = String(value ?? '').trim()
  if (text.length < 3 || text.length > maxLength || /[\r]/.test(text)) {
    throw new Error(`${label} must be plain text between 3 and ${maxLength} characters.`)
  }
  return text
}

function titleFromSlug(value) {
  return String(value)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
