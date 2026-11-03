/* Optional zero-dependency static server. `index.html` also works directly via file://. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const raw = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = raw === '/' ? 'index.html' : raw.replace(/^\/+/, '');
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log('Kyoraku Replay → http://' + host + ':' + port);
});
