const baseUrl = process.env.COCKPIT_SKILLS_URL ?? process.env.COCKPIT_COMMAND_URL ?? 'http://127.0.0.1:4314'

const inventoryResponse = await fetch(`${baseUrl}/api/skills`)
const inventory = await inventoryResponse.json()
if (!inventoryResponse.ok) throw new Error(inventory.error || `skills inventory returned HTTP ${inventoryResponse.status}`)
if (!Array.isArray(inventory.skills)) throw new Error('skills inventory did not return a skills array')
if (typeof inventory.counts?.skills !== 'number') throw new Error('skills inventory did not return counts')

const draftResponse = await fetch(`${baseUrl}/api/skills/draft`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    origin: baseUrl,
  },
  body: JSON.stringify({
    skillName: 'repo-status-coach',
    displayName: 'Repo Status Coach',
    goal: 'check a local repo and explain the safest next step',
    boundaries: 'Ask before editing files, running commands, installing packages, or touching secrets.',
    example: 'Help me understand what changed in this repo.',
  }),
})
const draft = await draftResponse.json()
if (!draftResponse.ok) throw new Error(draft.error || `skill draft returned HTTP ${draftResponse.status}`)
if (!draft.preview?.includes('name: repo-status-coach')) throw new Error('skill draft missing frontmatter name')
if (!draft.preview?.includes('Safe Boundaries')) throw new Error('skill draft missing safety boundaries')

const saveResponse = await fetch(`${baseUrl}/api/skills/drafts/save`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    origin: baseUrl,
  },
  body: JSON.stringify({
    confirm: 'SAVE',
    params: {
      skillName: 'repo-status-coach',
      displayName: 'Repo Status Coach',
      goal: 'check a local repo and explain the safest next step',
      boundaries: 'Ask before editing files, running commands, installing packages, or touching secrets.',
      example: 'Help me understand what changed in this repo.',
    },
  }),
})
const saved = await saveResponse.json()
if (!saveResponse.ok) throw new Error(saved.error || `skill save returned HTTP ${saveResponse.status}`)
if (!saved.path?.endsWith('/repo-status-coach/SKILL.md')) throw new Error('skill save returned an unexpected path')

const refreshedResponse = await fetch(`${baseUrl}/api/skills`)
const refreshed = await refreshedResponse.json()
if (!refreshedResponse.ok) throw new Error(refreshed.error || `refreshed skills returned HTTP ${refreshedResponse.status}`)
if ((refreshed.counts?.savedDrafts ?? 0) < 1) throw new Error('saved draft count did not update')

const pluginResponse = await fetch(`${baseUrl}/api/skills/plugin-pack/draft`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    origin: baseUrl,
  },
  body: JSON.stringify({
    pluginName: 'starter-skill-pack',
    displayName: 'Starter Skill Pack',
    skillNames: ['repo-status-coach'],
  }),
})
const pluginDraft = await pluginResponse.json()
if (!pluginResponse.ok) throw new Error(pluginDraft.error || `plugin draft returned HTTP ${pluginResponse.status}`)
if (!pluginDraft.preview?.includes('.codex-plugin/plugin.json')) throw new Error('plugin draft missing manifest preview')

const pluginSaveResponse = await fetch(`${baseUrl}/api/skills/plugin-pack/save`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    origin: baseUrl,
  },
  body: JSON.stringify({
    confirm: 'SAVE',
    pluginName: 'starter-skill-pack',
    displayName: 'Starter Skill Pack',
    skillNames: ['repo-status-coach'],
  }),
})
const pluginSaved = await pluginSaveResponse.json()
if (!pluginSaveResponse.ok) throw new Error(pluginSaved.error || `plugin save returned HTTP ${pluginSaveResponse.status}`)
if (!pluginSaved.files?.some((path) => path.endsWith('/.codex-plugin/plugin.json'))) {
  throw new Error('plugin save did not write a manifest path')
}

const installResponse = await fetch(`${baseUrl}/api/skills/drafts/install`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    origin: baseUrl,
  },
  body: JSON.stringify({
    confirm: 'INSTALL',
    skillName: 'repo-status-coach',
  }),
})
const installed = await installResponse.json()
if (!installResponse.ok) throw new Error(installed.error || `skill install returned HTTP ${installResponse.status}`)
if (!installed.path?.endsWith('/repo-status-coach/SKILL.md')) throw new Error('skill install returned an unexpected path')

console.log(
  JSON.stringify(
    {
      ok: true,
      skills: inventory.counts.skills,
      needsAttention: inventory.counts.needsAttention,
      draft: draft.pathPreview,
      saved: saved.path,
      savedDrafts: refreshed.counts.savedDrafts,
      pluginPack: pluginDraft.pathPreview,
      pluginSaved: pluginSaved.path,
      installed: installed.path,
    },
    null,
    2,
  ),
)
