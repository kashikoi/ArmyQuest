// sw.js — Army Quest service worker. Cache-first for full offline play.
// Bump CACHE on every release so clients pick up new assets.
const CACHE = 'armyquest-2026.10.31.2';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './parser.js',
  './gfx.js',
  './sprites.js',
  './engine.js',
  './rooms/room1_bedroom.js',
  './rooms/room2_street.js',
  './main.js',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Cache same-origin successful responses for next time.
          if (res && res.ok && new URL(req.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // Offline navigation fallback.
          if (req.mode === 'navigate') return caches.match('./index.html');
        });
    })
  );
});
