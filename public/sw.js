const CACHE_NAME = 'grupo-azevedo-v4';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json?v=7',
  '/logo_azevedo.png?v=7',
  '/logo_azevedo_512.png?v=7',
  '/logo_azevedo.svg?v=7',
  '/apple-touch-icon.png?v=7'
];

// Install Event - Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core shell assets...');
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
          .map((name) => {
            console.log('[SW] Removing old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Helper to determine if a request is for a static asset
function isStaticAsset(url) {
  const path = url.pathname;
  return (
    path.startsWith('/assets/') ||
    /\.(js|css|png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|eot|json)(\?.*)?$/i.test(path) ||
    PRECACHE_ASSETS.includes(path)
  );
}

// Fetch Event - Cache-First Strategy for static assets & Instant UI Shell
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Skip external APIs or WebSocket calls (Firestore, Firebase Auth, Google Maps, etc.)
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Strategy for Navigation requests (HTML pages / routes): Cache-First with Network Update for Instant Load
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cachedHtml) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', responseToCache));
            }
            return networkResponse;
          })
          .catch(() => {
            // Offline - network failed, return cached index.html
          });

        // Return cached HTML immediately if present, otherwise wait for network
        return cachedHtml || fetchPromise;
      })
    );
    return;
  }

  // Strategy for Static Assets: Explicit Cache-First Strategy
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Cache hit: serve from cache instantly, update cache asynchronously in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const copy = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
              }
            })
            .catch(() => {
              // Network fetch failed silently in background (offline)
            });
          return cachedResponse;
        }

        // Cache miss: fetch from network and store in cache
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default Stale-While-Revalidate for any other local GET request
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
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
      icon: icon || '/logo_azevedo.png?v=7',
      badge: '/logo_azevedo.png?v=7',
      tag: tag || 'grupo_azevedo_notif',
      vibrate: [200, 100, 200, 100, 200],
      data: { url: url || '/accounts-payable' }
    }).catch((err) => {
      console.warn('Service Worker showNotification failed:', err);
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

