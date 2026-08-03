const CACHE_NAME = 'grupo-azevedo-v7';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo_azevedo.png',
  '/logo_azevedo_512.png',
  '/logo_azevedo.svg',
  '/apple-touch-icon.png',
  '/apple-touch-icon-180x180.png',
  '/apple-touch-icon-152x152.png',
  '/apple-touch-icon-144x144.png',
  '/apple-touch-icon-120x120.png',
  '/apple-touch-icon-114x114.png',
  '/apple-touch-icon-76x76.png',
  '/apple-touch-icon-72x72.png',
  '/apple-touch-icon-57x57.png',
  '/apple-touch-icon-precomposed.png'
];

// Install Event - Pre-cache core shell & critical brand assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core shell and critical brand assets...');
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
            console.log('[SW] Purging old cache version:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Helper to determine if a request is for a static asset or image
function isStaticAsset(url) {
  const path = url.pathname;
  return (
    path.startsWith('/assets/') ||
    /\.(js|css|png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|eot|json)(\?.*)?$/i.test(path) ||
    PRECACHE_ASSETS.includes(path) ||
    path.includes('logo_azevedo')
  );
}

// Fetch Event - Aggressive Cache-First Strategy for static assets & Instant UI Shell
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Skip external APIs or third-party origins (Firestore, Firebase Auth, Google Maps, etc.)
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Strategy for Navigation requests (HTML pages / routes): Cache-First with Background Network Update
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html', { ignoreSearch: true }).then((cachedHtml) => {
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

        return cachedHtml || fetchPromise;
      })
    );
    return;
  }

  // Aggressive Cache-First Strategy for Static Assets, Icons, and Logos
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) {
          // Instant Cache Hit! Serve immediately.
          // Optionally trigger background refresh if online
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const copy = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
              }
            })
            .catch(() => {
              // Silently ignore background fetch errors when offline
            });
          return cachedResponse;
        }

        // Cache miss: fetch from network and cache for future instant loads
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(async () => {
            // Image/Asset Network Failure Fallback
            if (url.pathname.endsWith('.svg') || url.pathname.endsWith('.png') || url.pathname.includes('logo')) {
              const fallbackSvg = await caches.match('/logo_azevedo.svg', { ignoreSearch: true });
              if (fallbackSvg) return fallbackSvg;
              const fallbackPng = await caches.match('/logo_azevedo.png', { ignoreSearch: true });
              if (fallbackPng) return fallbackPng;
            }
            return new Response('Asset unavailable offline', { status: 503, statusText: 'Service Unavailable' });
          });
      })
    );
    return;
  }

  // Default Cache-First with Stale-While-Revalidate for all other local GET requests
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Network error ignored when serving cached fallback
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

