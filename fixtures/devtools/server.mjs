// Static servers: 4220 = app (devtools + playground pages, monaco assets), 4221 = remote.
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.html': 'text/html',
  '.css': 'text/css',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
};

// monaco-editor is the playground's own dependency; serve its AMD build locally.
const playgroundRequire = createRequire(
  createRequire(path.join(root, 'app', 'package.json')).resolve('@module-federation/playground'),
);
const monacoVs = path.join(path.dirname(playgroundRequire.resolve('monaco-editor/package.json')), 'min', 'vs');

function serveFrom(dir, pathname, res) {
  const file = path.join(dir, path.normalize(decodeURIComponent(pathname)));
  if (!file.startsWith(dir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Access-Control-Allow-Origin': '*' }).end('not found');
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
  http
    .createServer((req, res) => handler(new URL(req.url, `http://127.0.0.1:${port}`), res))
    .listen(port, '127.0.0.1', () => console.log(`listening on http://127.0.0.1:${port}`));
}

listen(4220, (url, res) => {
  if (url.pathname === '/__health') return res.writeHead(200).end('ok');
  if (url.pathname.startsWith('/monaco/vs/')) return serveFrom(monacoVs, url.pathname.slice('/monaco/vs'.length), res);
  serveFrom(path.join(root, 'app', 'dist'), url.pathname, res);
});
listen(4221, (url, res) => serveFrom(path.join(root, 'remote', 'dist'), url.pathname, res));
