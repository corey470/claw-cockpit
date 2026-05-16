import { readdir, readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'

export async function buildSkillWorkshop({ env, fixtureDir }) {
  const roots = fixtureDir ? [join(fixtureDir, 'skills')] : skillRoots(env)
  const skills = (await Promise.all(roots.map((root) => readSkillRoot(root)))).flat()
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
    },
    skills: sorted,
    pluginReadiness: {
      state: sorted.length > 0 ? 'attention' : 'unknown',
      summary:
        sorted.length > 0
          ? 'Skills are available. Plugin packaging should stay draft-only until install paths are explicit.'
          : 'No skills were found in the scanned roots.',
      nextStep: 'Draft skills first, then package related skills as a plugin pack after the shape is stable.',
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
      'Keeps install as a later reviewed step.',
    ],
  }
}

function skillRoots(env) {
  if (env.COCKPIT_SKILL_DIRS) {
    return env.COCKPIT_SKILL_DIRS.split(':').map((root) => root.trim()).filter(Boolean)
  }
  return [join(homedir(), '.codex', 'skills'), join(homedir(), '.openclaw', 'skills')]
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
