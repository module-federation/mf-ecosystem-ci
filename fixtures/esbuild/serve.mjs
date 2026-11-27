// Minimal static server with CORS: node serve.mjs <dir> <port>
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const [dir, port] = process.argv.slice(2)
const root = path.resolve(dir)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' }

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    let file = path.join(root, decodeURIComponent(url.pathname))
    if (!file.startsWith(root)) file = root
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (!fs.existsSync(file)) {
      res.writeHead(404).end('not found')
      return
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  .listen(Number(port), '127.0.0.1', () => console.log(`serving ${root} on http://localhost:${port}`))
