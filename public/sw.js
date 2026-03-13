// Service Worker for Push Notifications - Tu Taller

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Tu Taller';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    tag: data.type || 'default',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if possible
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new window
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
