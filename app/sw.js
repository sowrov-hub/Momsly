/* ==========================================================================
   MOMSLY — SERVICE WORKER
   Cache-first for the app shell (instant loads, offline capable),
   network-first fallback to cache for everything else.
   ========================================================================== */

const CACHE_NAME = 'momsly-cache-v2';
const APP_SHELL = [
  './',
  './index.html',
  './login.html',
  './signup.html',
  './forgot-password.html',
  './upgrade.html',
  './privacy.html',
  './terms.html',
  './offline.html',
  './tracker.html',
  './tools.html',
  './saved.html',
  './profile.html',
  './css/style.css',
  './css/theme.css',
  './css/animations.css',
  './manifest.json',
  './js/icons.js',
  './js/app.js',
  './js/router.js',
  './js/storage.js',
  './js/auth.js',
  './js/notification.js',
  './js/scheduler.js',
  './js/feeding.js',
  './js/sleep.js',
  './js/tracker.js',
  './js/milestones.js',
  './js/tools.js',
  './js/pages.js',
  './js/ui.js',
  './js/components.js',
  './js/charts.js',
  './js/utils.js',
  './js/export.js',
  './js/share.js',
  './js/backup.js',
  './js/data.js',
  './js/logic.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached || caches.match('./offline.html'));
      return cached || networkFetch;
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientsArr => {
      const hadWindow = clientsArr.find(c => c.url.includes('index.html'));
      if (hadWindow) return hadWindow.focus();
      return self.clients.openWindow('./index.html');
    })
  );
});
