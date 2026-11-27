// Serves the built HTTP remote on 127.0.0.1:4420 for the duration of the rstest run.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../remote/dist/http')
let server

export async function setup() {
  if (!fs.existsSync(path.join(root, 'remoteEntry.cjs'))) {
    throw new Error(`expected the built HTTP remote at ${root}; run the fixture build first`)
  }
  server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname))
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*' })
    fs.createReadStream(file).pipe(res)
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(4420, '127.0.0.1', resolve)
  })
}

export async function teardown() {
  await new Promise((resolve) => (server ? server.close(() => resolve()) : resolve()))
}
