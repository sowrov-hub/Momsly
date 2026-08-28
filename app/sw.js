/* ==========================================================================
   MOMSLY — SERVICE WORKER
   Cache-first for the app shell (instant loads, offline capable),
   network-first fallback to cache for everything else.
   ========================================================================== */

const CACHE_NAME = 'momsly-cache-v9';
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
  './medicine-health.html',
  './ask.html',
  './saved.html',
  './profile.html',
  './css/style.css',
  './css/theme.css',
  './css/animations.css',
  './manifest.json',
  './js/icons.js',
  './js/app.js',
  './js/router.js',
  './js/supabase-client.js',
  './js/push.js',
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
  './js/calendar.js',
  './js/memorybook.js',
  './js/medicine.js',
  './js/ai.js',
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

// ==================================================
// WEB PUSH — receive background push messages sent by the
// send-push-notification Supabase Edge Function and display them via
// the OS notification tray, even when no Momsly tab is open.
// ==================================================
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Momsly', body: event.data ? event.data.text() : 'You have a reminder.' };
  }

  const title = data.title || 'Momsly';
  const options = {
    body: data.body || '',
    icon: data.icon || './assets/icons/icon-192.png',
    badge: data.icon || './assets/icons/icon-192.png',
    tag: data.tag || 'momsly-reminder',
    vibrate: [60, 40, 60],
    data: { url: data.url || './index.html' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './index.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
      const existing = clientsArr.find(c => c.url.includes('index.html') || c.url.includes(targetUrl));
      if (existing) {
        if ('navigate' in existing && targetUrl !== './index.html') existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
