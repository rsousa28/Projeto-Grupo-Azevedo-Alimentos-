const CACHE_NAME = 'grupo-azevedo-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo_azevedo.png',
  '/logo_azevedo_512.png',
  '/logo_azevedo.svg',
  '/apple-touch-icon.png'
];

// Install Event - Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event - Clean up old caches & take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event - Handle network & offline strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Skip external APIs or WebSocket calls (Firestore, Google Auth, etc.)
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Strategy for Navigation requests (HTML pages): Network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and store fresh copy in cache
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Default offline root fallback
          return cache.match('/index.html');
        })
    );
    return;
  }

  // Strategy for static assets (JS, CSS, images, fonts): Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Ignore network fetch failure when offline
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Message Event - Handle direct notifications requested by application
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'TRIGGER_SYNC_NOTIFICATION' || event.data.type === 'SHOW_NOTIFICATION')) {
    const { title, body, icon, tag, url, count } = event.data.payload || {};
    const notifTitle = title || (count ? '⚡ Dados Sincronizados!' : '🔔 Notificação Grupo Azevedo');
    const notifBody = body || `${count || 1} item(ns) sincronizado(s) com sucesso na nuvem!`;

    self.registration.showNotification(notifTitle, {
      body: notifBody,
      icon: icon || '/logo_azevedo.svg',
      badge: '/logo_azevedo.svg',
      tag: tag || 'grupo_azevedo_notif',
      vibrate: [200, 100, 200, 100, 200],
      data: { url: url || '/accounts-payable' }
    });
  }
});

// Notification Click Event - Navigate user to relevant screen
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/checklist';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

