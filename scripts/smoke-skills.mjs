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

console.log(
  JSON.stringify(
    {
      ok: true,
      skills: inventory.counts.skills,
      needsAttention: inventory.counts.needsAttention,
      draft: draft.pathPreview,
    },
    null,
    2,
  ),
)
