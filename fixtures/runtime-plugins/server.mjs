// Static servers for the fixture. 4210 = host page, 4211 = healthy remote mirror,
// 4212 = broken "primary CDN" for the remote (every request answers 503).
// Every request is logged; GET http://127.0.0.1:4210/__requests returns the log.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const requests = [];
const types = { '.js': 'application/javascript', '.json': 'application/json', '.html': 'text/html' };

function serveFile(res, file) {
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': types[path.extname(file)] ?? 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
}

function listen(port, handler) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname !== '/__requests' && url.pathname !== '/__health') {
      requests.push({ port, path: url.pathname, search: url.search });
    }
    handler(url, res);
  });
  server.listen(port, '127.0.0.1', () => console.log(`listening on http://127.0.0.1:${port}`));
  return server;
}

const hostDist = path.join(root, 'host', 'dist');
const remoteDist = path.join(root, 'remote', 'dist');
const inside = (dir, p) => {
  const file = path.join(dir, path.normalize(p));
  return file.startsWith(dir) ? file : undefined;
};

listen(4210, (url, res) => {
  if (url.pathname === '/__health') return res.writeHead(200).end('ok');
  if (url.pathname === '/__requests') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(requests));
  }
  if (url.pathname === '/') return serveFile(res, path.join(root, 'host', 'index.html'));
  serveFile(res, inside(hostDist, url.pathname));
});

listen(4211, (url, res) => serveFile(res, inside(remoteDist, url.pathname)));

listen(4212, (_url, res) => {
  res.writeHead(503, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.end('primary CDN unavailable');
});
