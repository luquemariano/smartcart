const CACHE_NAME = 'smartcart-static-v1';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-store' });
            if (response.ok) await cache.put(url, response);
          } catch {
            /* fetch handler can populate the shell later */
          }
        }),
      );
      await self.skipWaiting();
    }),
  ),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('smartcart-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API GETs stay network-only. The client owns IndexedDB fallback/hydration;
  // the service worker must never turn an API failure into an invalid response.
  if (url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (response) =>
              response ||
              caches.match('/').then(
                (shell) =>
                  shell ||
                  new Response(
                    '<!doctype html><title>Sin conexión</title><h1>Sin conexión</h1>',
                    {
                      headers: {
                        'Content-Type': 'text/html; charset=utf-8',
                      },
                    },
                  ),
              ),
          ),
        ),
    );
    return;
  }
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          const copy = response.clone();
          void caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, copy));
          return response;
        }),
    ),
  );
});
