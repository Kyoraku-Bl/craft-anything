const CACHE_NAME = 'dimalingo-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('dimalingo-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Transformers.js manages its own model cache. Never intercept or duplicate
  // cross-origin model downloads, or return the app shell for failed assets.
  if (url.origin !== self.location.origin || url.pathname.endsWith('.wasm')) return;
  if (
    url.pathname.endsWith('.apk') ||
    url.pathname.endsWith('.mobileconfig')
  ) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(event.request, clone))
          .catch(() => {});
        return res;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || (event.request.mode === 'navigate' ? caches.match('/index.html') : Response.error()))
      )
  );
});
