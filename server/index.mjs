import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { buildCompatibilityReport } from './compatibilityReport.mjs'
import { commandCatalog, buildCommandDraft, readAuditLog, runCatalogCommand } from './commandCatalog.mjs'
import { buildOverview } from './overviewNormalizer.mjs'
import { defaultOpenClawPaths, readOpenClawSources } from './openclawSources.mjs'
import { recordFixture } from './fixtureRecorder.mjs'
import { redactForClient } from './redaction.mjs'
import {
  buildPluginPackDraft,
  buildSkillDraft,
  buildSkillWorkshop,
  installSkillDraft,
  savePluginPackDraft,
  saveSkillDraft,
} from './skillWorkshop.mjs'
import { buildWorkspaceSuggestions } from './workspaces.mjs'

const port = Number.parseInt(process.env.COCKPIT_API_PORT ?? '4314', 10)
const paths = defaultOpenClawPaths(process.env)
const execFileAsync = promisify(execFile)

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

  if (url.pathname === '/api/commands') {
    sendJson(response, 200, { commands: commandCatalog })
    return
  }

  if (url.pathname === '/api/skills') {
    sendJson(response, 200, await buildSkillWorkshop({ env: process.env, fixtureDir: process.env.COCKPIT_FIXTURE_DIR, paths }))
    return
  }

  if (url.pathname === '/api/compatibility-report') {
    const sources = await readOpenClawSources({
      env: process.env,
      fixtureDir: process.env.COCKPIT_FIXTURE_DIR,
      paths,
    })
    sendJson(
      response,
      200,
      await buildCompatibilityReport({
        sources,
        paths,
        env: process.env,
        fixtureDir: process.env.COCKPIT_FIXTURE_DIR,
      }),
    )
    return
  }

  if (url.pathname === '/api/skills/draft' && request.method === 'POST') {
    try {
      assertLocalRequest(request)
      const body = await readJsonBody(request)
      sendJson(response, 200, buildSkillDraft(body))
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (url.pathname === '/api/skills/drafts/save' && request.method === 'POST') {
    try {
      assertLocalRequest(request)
      const body = await readJsonBody(request)
      sendJson(response, 200, await saveSkillDraft({ params: body.params, confirm: body.confirm, paths }))
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (url.pathname === '/api/skills/drafts/install' && request.method === 'POST') {
    try {
      assertLocalRequest(request)
      const body = await readJsonBody(request)
      sendJson(
        response,
        200,
        await installSkillDraft({ skillName: body.skillName, confirm: body.confirm, paths, env: process.env }),
      )
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (url.pathname === '/api/skills/plugin-pack/draft' && request.method === 'POST') {
    try {
      assertLocalRequest(request)
      const body = await readJsonBody(request)
      sendJson(response, 200, await buildPluginPackDraft(body, paths))
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (url.pathname === '/api/skills/plugin-pack/save' && request.method === 'POST') {
    try {
      assertLocalRequest(request)
      const body = await readJsonBody(request)
      sendJson(
        response,
        200,
        await savePluginPackDraft({
          pluginName: body.pluginName,
          displayName: body.displayName,
          skillNames: body.skillNames,
          confirm: body.confirm,
          paths,
          env: process.env,
        }),
      )
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (url.pathname === '/api/workspaces') {
    sendJson(response, 200, await buildWorkspaceSuggestions({ paths }))
    return
  }

  if (url.pathname === '/api/fixtures/record' && request.method === 'POST') {
    try {
      assertLocalRequest(request)
      const body = await readJsonBody(request)
      const sources = await readOpenClawSources({
        env: process.env,
        fixtureDir: process.env.COCKPIT_FIXTURE_DIR,
        paths,
      })
      sendJson(response, 200, await recordFixture({ sources, paths, confirm: body.confirm, env: process.env }))
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (url.pathname === '/api/openclaw/dashboard' && request.method === 'POST') {
    try {
      assertLocalRequest(request)
      const result = await openOpenClawDashboard(process.env)
      sendJson(response, result.ok ? 200 : 400, result)
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (url.pathname === '/api/commands/preview' && request.method === 'POST') {
    try {
      assertLocalRequest(request)
      const body = await readJsonBody(request)
      const draft = buildCommandDraft(body.commandId, body.params)
      sendJson(response, 200, draft)
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (url.pathname === '/api/commands/run' && request.method === 'POST') {
    try {
      assertLocalRequest(request)
      const body = await readJsonBody(request)
      const result = await runCatalogCommand({
        commandId: body.commandId,
        params: body.params,
        confirm: body.confirm,
        paths,
        env: process.env,
        dryRun: Boolean(body.dryRun),
      })
      sendJson(response, result.ok ? 200 : 400, result)
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (url.pathname === '/api/runs') {
    sendJson(response, 200, { runs: await readAuditLog(paths) })
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

async function readJsonBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 32_000) throw new Error('Request body is too large.')
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : {}
}

function assertLocalRequest(request) {
  const host = request.headers.host ?? ''
  const origin = request.headers.origin ?? ''
  const hostOk = host.startsWith('127.0.0.1:') || host.startsWith('localhost:')
  const originOk = !origin || origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://localhost:')
  if (!hostOk || !originOk) throw new Error('Command requests must come from the local cockpit.')
}

async function openOpenClawDashboard(env) {
  try {
    const { stdout, stderr } = await execFileAsync('openclaw', ['dashboard', '--yes'], {
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
      env,
    })
    return {
      ok: true,
      stdout: redactForClient(stdout),
      stderr: redactForClient(stderr),
      openedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      ok: false,
      stdout: redactForClient(error?.stdout ?? ''),
      stderr: redactForClient(error?.stderr ?? ''),
      error: redactForClient(error instanceof Error ? error.message : String(error)),
    }
  }
}
