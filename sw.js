// Service worker Ostro (PWA, этап W1). Версия подставляется в CI (номер сборки): новая версия — новый кэш.
const VERSION = 'ostro-23';
const CORE = [
  './', 'index.html', 'flutter_bootstrap.js', 'main.dart.js', 'manifest.json', 'favicon.png',
  'icons/Icon-192.png', 'icons/Icon-512.png', 'sqlite3.wasm', 'sqflite_sw.js',
  'canvaskit/canvaskit.js', 'canvaskit/canvaskit.wasm',
];

self.addEventListener('install', (event) => {
  // Новая версия не включается сама: ждёт, пока пользователь нажмёт «Обновить» (сообщение skipWaiting).
  event.waitUntil(caches.open(VERSION).then((cache) =>
    // cache: 'reload' — мимо HTTP-кэша браузера: новая версия не должна сохранить старый main.dart.js.
    Promise.all(CORE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)))));
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ostro-') && k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Страница — сначала сеть (свежая версия), без сети — из кэша. Остальное — из кэша этой версии, иначе из сети.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('index.html', { cacheName: VERSION })));
    return;
  }
  event.respondWith(caches.open(VERSION).then((cache) => cache.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  }))));
});
