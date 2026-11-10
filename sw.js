// Offline support: caches the app's own files only. It never sees or
// stores your photos or answers, which live in IndexedDB.

const VERSION = 'samespot-v1';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './fonts/inter-latin.woff2',
  './fonts/instrument-serif-latin.woff2',
  './fonts/instrument-serif-italic-latin.woff2',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
  './js/app.js',
  './js/cards.js',
  './js/calendar.js',
  './js/config.js',
  './js/copy.js',
  './js/dates.js',
  './js/demo.js',
  './js/engine.js',
  './js/env.js',
  './js/html.js',
  './js/icons.js',
  './js/illustrations.js',
  './js/photos.js',
  './js/state.js',
  './js/store.js',
  './js/ui.js',
  './js/screens/about.js',
  './js/screens/checkin.js',
  './js/screens/home.js',
  './js/screens/landing.js',
  './js/screens/look.js',
  './js/screens/onboarding.js',
  './js/screens/privacy.js',
  './js/screens/record.js',
  './js/screens/sample.js',
  './js/screens/sample-check.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network first so updates arrive, cache when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Files: network first so every module comes from the same version,
  // with the cached copy as the offline fallback.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req)),
  );
});
