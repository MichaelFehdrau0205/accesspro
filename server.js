/* Access Pro demo server. No dependencies. Run: node server.js
   Serves the pages and keeps check-ins in memory so a phone, a kiosk and a staff
   screen on different devices (same Wi-Fi) can talk to each other. Data resets on restart. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const STATUSES = ['waiting', 'helping', 'done'];
let checkins = [];

function lanAddresses() {
  const out = [];
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach((k) => (nets[k] || []).forEach((n) => { if (n.family === 'IPv4' && !n.internal) out.push('http://' + n.address + ':' + PORT); }));
  return out;
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'application/json', 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readBody(req, cb) {
  let data = '';
  req.on('data', (c) => { data += c; if (data.length > 100000) { req.destroy(); } });
  req.on('end', () => { try { cb(null, JSON.parse(data || '{}')); } catch (e) { cb(e); } });
}
const str = (v, max) => String(v == null ? '' : v).slice(0, max);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (p === '/favicon.ico') { res.writeHead(204); return res.end(); }
  if (p === '/api/ping') return send(res, 200, { ok: true, lan: lanAddresses(), port: PORT });
  if (p === '/api/checkins' && req.method === 'GET') return send(res, 200, checkins);
  if (p === '/api/checkins' && req.method === 'POST') {
    return readBody(req, (err, b) => {
      if (err) return send(res, 400, { error: 'bad json' });
      const entry = {
        id: 'c' + Date.now() + Math.floor(Math.random() * 1000),
        ts: Date.now(), status: 'waiting',
        loc: str(b.loc, 80), situation: str(b.situation, 40), lang: str(b.lang, 5),
        needs: Array.isArray(b.needs) ? b.needs.slice(0, 12).map((n) => str(n, 30)) : [],
        preferred: str(b.preferred, 120), notes: str(b.notes, 300), via: str(b.via, 20)
      };
      checkins.unshift(entry);
      checkins = checkins.slice(0, 100);
      send(res, 201, entry);
    });
  }
  const m = p.match(/^\/api\/checkins\/([\w-]+)$/);
  if (m && req.method === 'PATCH') {
    return readBody(req, (err, b) => {
      if (err || STATUSES.indexOf(b.status) < 0) return send(res, 400, { error: 'bad status' });
      const c = checkins.find((x) => x.id === m[1]);
      if (!c) return send(res, 404, { error: 'not found' });
      c.status = b.status;
      send(res, 200, c);
    });
  }
  if (p.startsWith('/api/')) return send(res, 404, { error: 'not found' });

  // static files (no path traversal)
  let rel = decodeURIComponent(p === '/' ? '/index.html' : p);
  const file = path.normalize(path.join(ROOT, rel));
  if (file.indexOf(ROOT + path.sep) !== 0 || /node_modules|server\.js|package/.test(rel)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, buf, MIME[path.extname(file)] || 'application/octet-stream');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\nAccess Pro is running.\n');
  console.log('  On this computer:  http://localhost:' + PORT);
  lanAddresses().forEach((a) => console.log('  On your phone:     ' + a + '   (same Wi-Fi)'));
  console.log('\n  Pages: /phone.html  /scan.html  /checkin.html  /staff.html  /kiosk.html\n');
});
