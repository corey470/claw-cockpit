import { createServer } from 'node:http'
import { buildOverview } from './overviewNormalizer.mjs'
import { defaultOpenClawPaths, readOpenClawSources } from './openclawSources.mjs'

const port = Number.parseInt(process.env.COCKPIT_API_PORT ?? '4314', 10)
const paths = defaultOpenClawPaths(process.env)

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`)

  if (url.pathname === '/api/overview') {
    const sources = await readOpenClawSources({
      env: process.env,
      fixtureDir: process.env.COCKPIT_FIXTURE_DIR,
      paths,
    })
    sendJson(response, 200, buildOverview({ sources, paths, env: process.env }))
    return
  }

  if (url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, generatedAt: new Date().toISOString() })
    return
  }

  sendJson(response, 404, { error: 'Not found' })
}).listen(port, '127.0.0.1', () => {
  const mode = process.env.COCKPIT_FIXTURE_DIR ? 'fixture' : 'live'
  console.log(`[claw-cockpit] ${mode} adapter listening at http://127.0.0.1:${port}`)
})

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(body))
}
