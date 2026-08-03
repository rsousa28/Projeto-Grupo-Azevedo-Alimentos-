/*
 * Firebase Cloud Messaging Service Worker for Grupo Azevedo PWA
 * Handles background push notifications when the browser/app is closed or in background.
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBNYBj-SnNhqwrzDXvuIigIdcD-LOpNQqI",
  authDomain: "gen-lang-client-0790951913.firebaseapp.com",
  projectId: "gen-lang-client-0790951913",
  storageBucket: "gen-lang-client-0790951913.firebasestorage.app",
  messagingSenderId: "244010170526",
  appId: "1:244010170526:web:035ef6dca66a6f059ee38f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background Push Message received:', payload);
  
  const title = payload.notification?.title || payload.data?.title || '🔔 Grupo Azevedo';
  const body = payload.notification?.body || payload.data?.body || 'Nova notificação recebida.';
  const icon = payload.notification?.icon || payload.data?.icon || '/logo_azevedo.png?v=7';
  const tag = payload.data?.tag || 'fcm_push';
  const url = payload.data?.url || '/';

  const notificationOptions = {
    body,
    icon,
    badge: '/logo_azevedo.png?v=7',
    tag,
    vibrate: [200, 100, 200, 100, 200],
    data: { url }
  };

  self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
