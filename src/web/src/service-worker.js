const CODE_CACHE_NAME = 'code-cache-v2';
const CARDS_CACHE_NAME = 'cards-cache-v4';

self.addEventListener('activate', event => {
  event.waitUntil(
    clients.claim(),
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CODE_CACHE_NAME && cacheName !== CARDS_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
        );
    })
    );
});

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CODE_CACHE_NAME)
      .then(cache => fetch('/assets/index.json')
        .then(response => response.json())
        .then(assets => {
          const urlsToCache = assets.map(asset => `/${asset}`);
          urlsToCache.push('/');
          return cache.addAll(urlsToCache);
        })
        ),
    caches.open(CARDS_CACHE_NAME)
      .then(cache => fetch('/assets/cards/index.json')
        .then(response => response.json())
        .then(cards => {
          const urlsToCache = cards.map(card => `/${card}`);
          return cache.addAll(urlsToCache);
        })
        )
      .then(() => self.skipWaiting())
      );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
    );
});

self.addEventListener('message', event => {
  if (event.data.type === 'GET_CACHE_STATUS') {
    Promise.all([
      caches.open(CODE_CACHE_NAME).then(cache => cache.match('/assets/index.json')),
      caches.open(CARDS_CACHE_NAME).then(cache => cache.match('/assets/cards/index.json'))
    ]).then(([codeResponse, cardsResponse]) => {
      const status = codeResponse && cardsResponse ? 'success' : 'failed';
      event.source.postMessage({ message: 'Assets cached', status });
    });
  }
});
