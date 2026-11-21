// Erzeugt dist/sw.js mit vollständiger Precache-Liste (alle Build-Dateien inkl. data.enc) und Versions-Hash.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'

const dist = new URL('../dist/', import.meta.url).pathname
const files = []
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(relative(dist, p).split('\\').join('/')) } }
walk(dist)
const list = files.filter(f => f !== 'sw.js' && !f.endsWith('.map')).sort()
const h = createHash('sha256'); for (const f of list) h.update(f).update(readFileSync(join(dist, f)))
const version = h.digest('hex').slice(0, 12)
const sw = `// RESCUE GE Service Worker – generiert von tools/gen-sw.mjs
const VERSION = '${version}';
const CACHE = 'rescue-ge-' + VERSION;
const FILES = ${JSON.stringify(['./', ...list.map(f => './' + f)])};
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('rescue-ge-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Cache zuerst (offline), Navigationen auf index.html abbilden
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await c.match('./index.html') : undefined);
    if (hit) return hit;
    try { return await fetch(req); } catch { return (await c.match('./index.html')) || Response.error(); }
  }));
});
`
writeFileSync(join(dist, 'sw.js'), sw)
console.log(`dist/sw.js: ${list.length} Dateien, Version ${version}`)
