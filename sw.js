/* Colorado No2 service worker: fast loads + offline. */
const VERSION = 'no2-v1';
const SHELL = [
  './', './index.html', './offline.html', './manifest.webmanifest',
  './css/app.css', './js/app.js', './js/data.js',
  './fonts/stencil.woff2', './fonts/baskerville.woff2', './fonts/baskerville-italic.woff2',
  './art/parchment.svg', './art/stars-circle.svg', './art/eagle.svg', './art/bell.svg', './art/quill.svg', './art/flag.svg',
  './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-32.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // Pages: try the network first (fresh), fall back to a saved copy, then the offline page.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match('./offline.html'))
    );
    return;
  }

  // Files (styles, scripts, pictures): answer from the saved copy right away, refresh it in the background.
  e.respondWith(
    caches.match(req).then((cached) => {
      const fresh = fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
