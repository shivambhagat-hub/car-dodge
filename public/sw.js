self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('car-dodge-v1').then(cache => cache.addAll(['/','/index.html']))
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});