// sw.js
const CACHE_NAME = 'quran-life-v4.0.0'; 
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/data/quran.json',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        ).then(() => {
            clients.claim();
            clients.matchAll({ type: 'window' }).then(clientsArr => {
                clientsArr.forEach(client => {
                    client.postMessage({ type: 'UPDATE_AVAILABLE' });
                });
            });
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
