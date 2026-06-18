import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const apiPort = '4514'
const webPort = '4520'
const fixtureDir = join(root, 'fixtures', 'openclaw-current')
const smokeOpenClawHome = join(root, '.tmp', 'openclaw-smoke')
const smokeInstallSkillDir = join(root, '.tmp', 'installed-skills')
const smokePluginPackDir = join(root, '.tmp', 'plugin-packs')
const viteBin = join(root, 'node_modules', '.bin', 'vite')
const env = {
  ...process.env,
  OPENCLAW_HOME: smokeOpenClawHome,
  COCKPIT_INSTALL_SKILL_DIR: smokeInstallSkillDir,
  COCKPIT_PLUGIN_PACK_DIR: smokePluginPackDir,
  COCKPIT_API_PORT: apiPort,
  COCKPIT_FIXTURE_DIR: fixtureDir,
  COCKPIT_API_TARGET: `http://127.0.0.1:${apiPort}`,
  COCKPIT_OVERVIEW_URL: `http://127.0.0.1:${apiPort}/api/overview`,
  COCKPIT_COMMAND_URL: `http://127.0.0.1:${apiPort}`,
  COCKPIT_COMPATIBILITY_URL: `http://127.0.0.1:${apiPort}`,
  COCKPIT_SKILLS_URL: `http://127.0.0.1:${apiPort}`,
  COCKPIT_WORKSPACES_URL: `http://127.0.0.1:${apiPort}`,
  COCKPIT_UI_URL: `http://127.0.0.1:${webPort}`,
}

const children = []

try {
  children.push(spawn(process.execPath, [join(root, 'server', 'index.mjs')], { cwd: root, env, stdio: 'inherit' }))
  children.push(spawn(viteBin, ['--host', '127.0.0.1', '--port', webPort], { cwd: root, env, stdio: 'inherit' }))

  await waitFor(`${env.COCKPIT_OVERVIEW_URL}`)
  await waitFor(`${env.COCKPIT_UI_URL}`)
  await run(process.execPath, [join(root, 'scripts', 'smoke-overview.mjs')], env)
  await run(process.execPath, [join(root, 'scripts', 'smoke-compatibility.mjs')], env)
  await run(process.execPath, [join(root, 'scripts', 'smoke-workspaces.mjs')], env)
  await run(process.execPath, [join(root, 'scripts', 'smoke-commands.mjs')], env)
  await run(process.execPath, [join(root, 'scripts', 'smoke-skills.mjs')], env)
  await run(process.execPath, [join(root, 'scripts', 'smoke-ui.mjs')], env)
} finally {
  for (const child of children) child.kill('SIGTERM')
}

async function waitFor(url) {
  const started = Date.now()
  let lastError = ''
  while (Date.now() - started < 20_000) {
    try {
      const response = await fetch(url)
      if (response.ok) return
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolve) => setTimeout(resolve, 350))
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`)
}

function run(command, args, childEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: childEnv, stdio: 'inherit' })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`))
    })
  })
}
