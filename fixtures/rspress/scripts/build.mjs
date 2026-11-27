// Build the provider docs, serve them, then build the consumer docs. The consumer's SSG
// step loads the provider's federated fragment over HTTP, so the provider must be up.
import { spawn } from 'node:child_process'
import { serve } from './serve.mjs'

// Async on purpose: a sync child would block the event loop that serves the provider.
const run = (cmd) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, { stdio: 'inherit', shell: true })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))))
  })

await run('pnpm --filter ./provider run build')
const server = await serve('provider/doc_build', 4410)
try {
  await run('pnpm --filter ./consumer run build')
} finally {
  server.close()
}
