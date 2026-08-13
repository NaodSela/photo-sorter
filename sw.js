/* Network-first for the page itself, cache-first for the static bits.

   The page is what changes when a new version is published, so it is always
   fetched fresh when there is a connection and only falls back to the cached
   copy when there isn't. That means publishing a new index.html reaches every
   device on its next open, with no cache version to remember to bump. */
const CACHE = 'folder-sorter';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Google and the geocoder must always go to the network, never the cache
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  const isPage = e.request.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname);

  if (isPage) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
          return res;
        })
        .catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }))
  );
});
