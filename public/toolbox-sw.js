// Toolbox-only service worker (registered with scope /toolbox). Network first, cache fallback,
// so the Toolbox page and its static chunks open with no signal.
const CACHE = 'te-toolbox-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.add('/toolbox')).catch(() => {})); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (!(url.pathname.startsWith('/toolbox') || url.pathname.startsWith('/_next/static/'))) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok && !res.redirected) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('/toolbox')))
  );
});
