// コンテ帳 - Service Worker
// 方針：ネットがあれば常に最新を取得し、取得できたものをキャッシュに保存。
//       オフラインで取得に失敗した時だけ、キャッシュから返す（フォールバック）。
const CACHE_NAME = 'conte-cache-v3';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// インストール時：初回キャッシュを作る（失敗しても進める）
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(FILES_TO_CACHE))
      .catch(() => {})
  );
  self.skipWaiting();
});

// 有効化時：古いバージョンのキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// リクエスト時：ネットワーク優先 → 取得できたら表示＋キャッシュ更新
//              失敗（オフライン等）したらキャッシュから返す
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
