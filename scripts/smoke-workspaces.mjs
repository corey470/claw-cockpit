const baseUrl = process.env.COCKPIT_WORKSPACES_URL ?? process.env.COCKPIT_COMMAND_URL ?? 'http://127.0.0.1:4314'

const response = await fetch(`${baseUrl}/api/workspaces`)
const json = await response.json()
if (!response.ok) throw new Error(json.error || `workspaces returned HTTP ${response.status}`)
if (!Array.isArray(json.workspaces)) throw new Error('workspace suggestions did not return an array')
if (json.workspaces.length === 0) throw new Error('workspace suggestions returned no folders')
if (!json.workspaces.every((workspace) => workspace.path?.startsWith('/'))) {
  throw new Error('workspace suggestions must use absolute local paths')
}

console.log(
  JSON.stringify(
    {
      ok: true,
      workspaces: json.workspaces.length,
      first: json.workspaces[0],
    },
    null,
    2,
  ),
)
