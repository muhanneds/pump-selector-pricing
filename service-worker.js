const CACHE_NAME = 'msp-pump-pricing-v22';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './i18n.js',
  './engine.js',
  './data.js',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/msp-logo-white.png'
];

// cache.addAll() does a plain fetch per asset, which can silently reuse the
// browser's own HTTP cache instead of hitting the network -- so a fresh
// CACHE_NAME could still precache a stale asset if the browser had already
// fetched it earlier in the session. {cache:'reload'} forces each precache
// fetch past the HTTP cache, so install always pulls the true current files.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(ASSETS.map(url => fetch(url, { cache: 'reload' }).then(resp => cache.put(url, resp))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first for app shell/data, falling back to network, so the app works fully offline
// once installed. Everything here is local (no external calls), so this is safe.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return resp;
      }).catch(() => cached);
    })
  );
});
