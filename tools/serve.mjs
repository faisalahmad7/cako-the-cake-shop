// Tiny static server for local preview (no dependencies). Usage: node tools/serve.mjs [folder] [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const root = path.resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || process.env.PORT || 5173);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' }).end(data);
  });
});

// if the port is busy (another server is already running), try the next one
let tryPort = port;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && tryPort < port + 20) {
    console.log(`Port ${tryPort} is busy, trying ${tryPort + 1}...`);
    tryPort += 1;
    server.listen(tryPort);
  } else {
    throw err;
  }
});
server.on('listening', () => {
  const lan = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal);
  console.log(`Cako site running:\n  this computer:  http://localhost:${tryPort}\n  phone (same Wi-Fi): ${lan ? `http://${lan.address}:${tryPort}` : '(no network found)'}\nPress Ctrl+C to stop.`);
});
server.listen(tryPort);
