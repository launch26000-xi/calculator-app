/* Mind Movie service worker: offline app shell + daily reminder. */
const VERSION = 'mm-v2';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/main.js', './js/db.js', './js/model.js', './js/core.js', './js/store.js', './js/renderer.js', './js/engine.js',
  './js/ui.js', './js/actions.js', './js/library.js', './js/timeline.js', './js/inspector.js', './js/safety.js',
  './js/progress.js', './js/player.js', './js/exporter.js', './js/templates.js', './js/help.js', './js/guide.js', './js/joy.js',
  './icons/icon-96.png', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-192.png', './icons/maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('mm-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html', { ignoreSearch: true })));
    return;
  }
  // stale-while-revalidate for app files
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});

// ----- daily reminder (Periodic Background Sync, where Chrome allows it) -----
function kv(key) {
  return new Promise((resolve) => {
    const r = indexedDB.open('mindmovie', 1);
    r.onsuccess = () => {
      try {
        const g = r.result.transaction('kv').objectStore('kv').get(key);
        g.onsuccess = () => resolve(g.result ? g.result.v : undefined);
        g.onerror = () => resolve(undefined);
      } catch (e) { resolve(undefined); }
    };
    r.onerror = () => resolve(undefined);
  });
}
function setKv(key, v) {
  return new Promise((resolve) => {
    const r = indexedDB.open('mindmovie', 1);
    r.onsuccess = () => { try { const t = r.result.transaction('kv', 'readwrite'); t.objectStore('kv').put({ k: key, v }); t.oncomplete = resolve; t.onerror = resolve; } catch (e) { resolve(); } };
    r.onerror = resolve;
  });
}
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
async function maybeRemind() {
  const rem = await kv('reminder');
  if (!rem || !rem.on) return;
  const [hh, mm] = (rem.time || '08:00').split(':').map(Number);
  const now = new Date();
  if (now.getHours() * 60 + now.getMinutes() < hh * 60 + mm) return;
  const k = dayKey();
  const watched = (await kv('watched')) || [];
  if (watched.includes(k) || (await kv('remindedOn')) === k) return;
  await setKv('remindedOn', k);
  await self.registration.showNotification('Mind Movie', { body: 'Time to watch your Mind Movie ✨ Keep your streak going.', icon: 'icons/icon-192.png', badge: 'icons/icon-96.png', tag: 'mm-reminder' });
}
self.addEventListener('periodicsync', (e) => { if (e.tag === 'mm-reminder') e.waitUntil(maybeRemind()); });
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => {
    for (const c of list) if ('focus' in c) { c.navigate('./#play').catch(() => {}); return c.focus(); }
    return self.clients.openWindow('./#play');
  }));
});
