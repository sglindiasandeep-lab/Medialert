// MedCare Service Worker — cache-first offline strategy
const CACHE = 'medcare-v1';

// Everything the app needs to run fully offline
const PRECACHE = [
  '/',
  '/index.html',
  // Google Fonts — cache the CSS + actual font files on first fetch
];

// On install: cache the shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// On activate: clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
//   • Same-origin requests  → cache-first, fall back to network, then cache response
//   • Google Fonts          → cache-first (so fonts work offline after first visit)
//   • Everything else       → network-only
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Only handle GET
  if (e.request.method !== 'GET') return;

  const isApp   = url.origin === self.location.origin;
  const isFonts = url.hostname === 'fonts.googleapis.com' ||
                  url.hostname === 'fonts.gstatic.com';

  if (isApp || isFonts) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          // Cache a clone so we can still return the original
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => cached); // if both fail, return whatever we have
      })
    );
  }
});
