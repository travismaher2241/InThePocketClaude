const CACHE_NAME = 'coachcore-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // 1. Only intercept and cache GET requests (Cache API does not support POST, PUT, DELETE)
  // 2. Explicitly bypass Firestore and Firebase Auth endpoints from SW interception
  if (
    e.request.method !== 'GET' ||
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com')
  ) {
    return; // Pass directly to network
  }

  // Offline fallback cache-first strategy for static assets
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback
      });
    })
  );
});
