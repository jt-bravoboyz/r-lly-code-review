// R@lly Service Worker for Push Notifications

self.addEventListener('push', function(event) {
  console.log('[SW] Push received:', event);
  
  let data = { title: 'R@lly', body: 'New notification' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: '/rally-icon-192.png',
    badge: '/rally-icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: true,
    tag: data.tag || 'rally-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/rides';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('install', function(event) {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});
