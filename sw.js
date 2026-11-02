// 时间方块 Service Worker
// 作用：把页面文件缓存在手机上，没网也能打开。
// 策略：先用缓存秒开，同时在后台联网检查新版本，下次打开时生效。
// 改了 index.html 后，把下面的版本号 +1，手机就会更新缓存。
const CACHE = 'timeblocks-v2';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async cache => {
      // 打开页面（导航请求）统一用缓存里的首页
      const key = req.mode === 'navigate' ? './index.html' : req;
      const cached = await cache.match(key, { ignoreSearch: true });
      const network = fetch(req)
        .then(res => {
          if (res && res.ok) cache.put(key, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) {
        event.waitUntil(network);   // 后台更新
        return cached;
      }
      const res = await network;
      return res || new Response('离线且没有缓存，请联网后再打开一次。', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    })
  );
});
