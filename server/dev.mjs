import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const viteBin = join(root, 'node_modules', '.bin', 'vite')

const children = [
  spawn(process.execPath, [join(root, 'server', 'index.mjs')], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, COCKPIT_API_PORT: process.env.COCKPIT_API_PORT ?? '4314' },
  }),
  spawn(viteBin, [], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  }),
]

const shutdown = (signal) => {
  for (const child of children) child.kill(signal)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (signal) return
    if (code && code !== 0) {
      shutdown('SIGTERM')
      process.exitCode = code
    }
  })
}
