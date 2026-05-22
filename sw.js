// sw.js
const CACHE_NAME = 'quran-life-v5.1.0';
const ASSETS = [
    './',
    './index.html',
    './assets/css/style.css',
    './assets/js/app.js',
    './data/quran.json',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './assets/azan/default.mp3'
];
self.addEventListener('install', e => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then(cache => Promise.all(ASSETS.map(url => cache.add(url).catch(()=>{})))));
});
self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>{
        clients.claim(); clients.matchAll({type:'window'}).then(arr=>arr.forEach(c=>c.postMessage({type:'UPDATE_AVAILABLE'})));
    }));
});
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request).then(response => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy)).catch(()=>{});
            return response;
        }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
});
self.addEventListener('message', e => { if(e.data&&e.data.type==='SKIP_WAITING') self.skipWaiting(); });
