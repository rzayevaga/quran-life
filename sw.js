// sw.js
const CACHE_NAME = 'quran-life-v5.0.0';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
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
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match('./index.html'))));
});
self.addEventListener('message', e => { if(e.data&&e.data.type==='SKIP_WAITING') self.skipWaiting(); });
