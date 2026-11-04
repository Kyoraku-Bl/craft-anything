const CACHE_NAME = 'dimalingo-v2';
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
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
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
          .then((cached) => cached || caches.match('/index.html'))
      )
  );
});
