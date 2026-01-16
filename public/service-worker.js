self.addEventListener('install', (event) => {
  event.waitUntil(caches.open('roulotte-static-v1').then((cache) => {
    return cache.addAll([
      '/',
      '/index.html',
      '/style.css',
      '/app.js'
    ]);
  }));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        try {
          const copy = res.clone();
          caches.open('roulotte-static-v1').then((cache) => cache.put(req, copy));
        } catch {}
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
