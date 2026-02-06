// R@lly Service Worker for Push Notifications and Offline Support

const CACHE_NAME = 'rally-cache-v3';
const OFFLINE_URL = '/';

// Files to cache for offline use (avoid caching '/' to prevent stale HTML pointing to old bundles)
const STATIC_ASSETS = [
  '/manifest.json',
  '/rally-icon-192.png',
];

// Install event - cache static assets
self.addEventListener('install', function(event) {
  console.log('[SW] Service Worker installing');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('[SW] Service Worker activated');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  event.waitUntil(clients.claim());
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // IMPORTANT: never cache the app bundle/chunks (prevents stale code + auth/RLS bugs)
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/src/')) {
    return;
  }

  // Skip API calls and Supabase requests
  if (
    url.pathname.startsWith('/api') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('googleapis')
  ) {
    return;
  }

  // Network-first for navigations (HTML shell) to avoid stale index.html referencing old bundles
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(function(response) {
          // Optionally refresh cached offline URL (best-effort)
          if (response && response.ok) {
            const clone = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then(function(cache) {
                return cache.put(OFFLINE_URL, clone);
              })
            );
          }
          return response;
        })
        .catch(function() {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if (cachedResponse) {
        // Return cached response and update cache in background
        event.waitUntil(
          fetch(event.request, { cache: 'no-store' })
            .then(function(response) {
              if (response.ok && response.type === 'basic') {
                caches.open(CACHE_NAME).then(function(cache) {
                  cache.put(event.request, response.clone());
                });
              }
            })
            .catch(function() {})
        );
        return cachedResponse;
      }

      // Not in cache, try network
      return fetch(event.request, { cache: 'no-store' })
        .then(function(response) {
          // Cache successful responses
          if (response.ok && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(function() {
          // Offline - return cached offline page for navigation
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});

// Push notification handling
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

// Notification click handling
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/events';
  
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

// Background sync for offline actions
self.addEventListener('sync', function(event) {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-rally-updates') {
    event.waitUntil(syncRallyUpdates());
  }
});

async function syncRallyUpdates() {
  // Get pending updates from IndexedDB and sync them
  try {
    const db = await openDB();
    const tx = db.transaction('pending-updates', 'readonly');
    const store = tx.objectStore('pending-updates');
    const updates = await store.getAll();
    
    for (const update of updates) {
      await fetch(update.url, {
        method: update.method,
        headers: update.headers,
        body: update.body,
      });
    }
    
    // Clear synced updates
    const clearTx = db.transaction('pending-updates', 'readwrite');
    await clearTx.objectStore('pending-updates').clear();
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('rally-offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-updates')) {
        db.createObjectStore('pending-updates', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}
