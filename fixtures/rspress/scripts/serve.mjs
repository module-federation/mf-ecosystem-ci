// Minimal static server with CORS. CLI: node scripts/serve.mjs <dir> <port>
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.txt': 'text/plain',
}

export function serve(dir, port) {
  const root = path.resolve(dir)
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    let file = path.join(root, decodeURIComponent(url.pathname))
    if (!file.startsWith(root)) file = root
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) file = `${file}.html`
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (!fs.existsSync(file)) {
      res.writeHead(404).end('not found')
      return
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise((resolve) =>
    server.listen(Number(port), '127.0.0.1', () => {
      console.log(`serving ${root} on http://localhost:${port}`)
      resolve(server)
    }),
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dir, port] = process.argv.slice(2)
  await serve(dir, port)
}
