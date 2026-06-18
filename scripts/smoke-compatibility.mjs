const baseUrl = process.env.COCKPIT_COMPATIBILITY_URL ?? process.env.COCKPIT_API_TARGET ?? 'http://127.0.0.1:4314'

const report = await get('/api/compatibility-report')
const failures = []

if (!report?.generatedAt) failures.push('generatedAt missing')
if (report?.adapterContract?.schemaVersion !== '2026-06-18.1') failures.push('adapter contract schema mismatch')
if (!report?.updateRadar?.local?.version) failures.push('update radar local version missing')
if (!Array.isArray(report?.updateRadar?.repos)) failures.push('update radar repos missing')
if (!report?.contract?.contractVersion) failures.push('contract version missing')
if (!Array.isArray(report?.contract?.checks)) failures.push('contract checks missing')
if (!Array.isArray(report?.repairRecipes)) failures.push('repair recipes missing')
if (!report?.nextBestMove?.title) failures.push('next best move missing')

const contractIds = new Set(report.contract?.checks?.map((check) => check.id) ?? [])
for (const id of ['cli-core', 'status-shape', 'gateway-probe', 'setup-command-surface', 'security-summary']) {
  if (!contractIds.has(id)) failures.push(`contract check missing: ${id}`)
}

const fixture = await post('/api/fixtures/record', { confirm: 'RECORD' })
if (!fixture.ok) failures.push(fixture.error || 'fixture record failed')
if (!fixture.path) failures.push('fixture path missing')
if (!Array.isArray(fixture.files) || fixture.files.length < 6) failures.push('fixture files missing')

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(
  JSON.stringify(
    {
      ok: true,
      posture: report.contract.posture,
      updateState: report.updateRadar.recommendation.state,
      recipes: report.repairRecipes.length,
      fixturePath: fixture.path,
    },
    null,
    2,
  ),
)

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`)
  const json = await response.json()
  if (!response.ok) throw new Error(json.error || `${path} returned HTTP ${response.status}`)
  return json
}

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: baseUrl,
    },
    body: JSON.stringify(body),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json.error || `${path} returned HTTP ${response.status}`)
  return json
}
