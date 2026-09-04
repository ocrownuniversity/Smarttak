// SmileTak service worker
// Bump this on every deploy so old caches get cleaned up and the new
// index.html actually reaches people instead of being stuck behind a stale
// cache entry.
const CACHE_VERSION = 'smiletak-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './icon-48.png',
  './icon-72.png',
  './icon-96.png',
  './icon-128.png',
  './icon-144.png',
  './icon-152.png',
  './icon-167.png',
  './icon-180.png',
  './icon-192.png',
  './icon-256.png',
  './icon-384.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never intercept writes/POSTs

  const url = new URL(req.url);

  // Only handle same-origin requests for our own shell files. Everything
  // else (Firebase Auth, Firestore, Storage, any third-party API/CDN) goes
  // straight to the network untouched — this app is a live chat app, and
  // caching real-time data would show people stale messages.
  if (url.origin !== self.location.origin) return;

  // Navigations (loading the app itself): try the network first so people
  // always get the latest deployed index.html, falling back to the cached
  // copy only when they're offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static shell assets (icons, manifest): cache-first, since these never
  // change without a new CACHE_VERSION anyway.
  if (APP_SHELL.some((path) => req.url.endsWith(path.replace('./', '')))) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  }
});
