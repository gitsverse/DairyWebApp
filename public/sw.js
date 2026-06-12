const CACHE_NAME = 'dairy-app-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Only intercept static assets in the public folder to avoid breaking dynamic routes/APIs
  const url = new URL(event.request.url);
  const isStaticAsset = url.pathname.startsWith('/icons/') || 
                        url.pathname.startsWith('/fonts/') || 
                        url.pathname === '/manifest.json' ||
                        url.pathname === '/favicon.ico';
                        
  if (!isStaticAsset) {
    return; // Let browser handle dynamic content natively
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
