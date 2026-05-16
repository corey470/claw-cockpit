const url = process.env.COCKPIT_OVERVIEW_URL ?? 'http://127.0.0.1:4314/api/overview'
const allowDrift = process.argv.includes('--allow-drift') || process.env.COCKPIT_ALLOW_DRIFT === '1'

let overview = await fetchOverview()
if (!allowDrift && overview?.compatibility?.posture === 'blocked') {
  await new Promise((resolve) => setTimeout(resolve, 1200))
  overview = await fetchOverview()
}
const failures = []

if (!overview?.generatedAt) failures.push('generatedAt missing')
if (overview?.adapter?.schemaVersion !== '2026-05-16.1') failures.push('adapter schema version mismatch')
if (!overview?.gateway?.state) failures.push('gateway state missing')
if (!overview?.counts || typeof overview.counts.agents !== 'number') failures.push('agent count missing')
if (!Array.isArray(overview?.checks)) failures.push('setup checks missing')
if (!overview?.compatibility?.posture) failures.push('compatibility posture missing')
if (!Array.isArray(overview?.compatibility?.checks)) failures.push('compatibility checks missing')
if (Object.hasOwn(overview, 'rawStatus') && overview.rawStatus) failures.push('rawStatus should be disabled by default')
if (!allowDrift && overview?.compatibility?.posture === 'blocked') {
  failures.push('compatibility posture is blocked; rerun with --allow-drift only when intentionally inspecting drift')
}

const requiredCompatibilityIds = ['cli-surface', 'parser-shape', 'local-state', 'security-posture', 'gateway-contract']
const compatibilityIds = new Set(overview.compatibility?.checks?.map((check) => check.id) ?? [])
for (const id of requiredCompatibilityIds) {
  if (!compatibilityIds.has(id)) failures.push(`compatibility check missing: ${id}`)
}

if (overview.counts.agents < overview.agents.length) {
  failures.push('agent count is lower than displayed worker list')
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(
  JSON.stringify(
    {
      ok: true,
      workers: overview.counts.agents,
      setupWarnings: overview.counts.warnings,
      compatibility: overview.compatibility.posture,
      compatibilityChecks: overview.compatibility.checks.length,
    },
    null,
    2,
  ),
)

async function fetchOverview() {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Overview returned HTTP ${response.status}`)
  }

  return response.json()
}
