// 丹波農商 牧場物語 サービスワーカー
// - ゲーム本体(index.html)と version.json は「ネット優先」= 更新は次に開いた時に必ず反映(古い版が残らない)
// - 3Dモデル・画像・ライブラリは「キャッシュ優先」= 2回目以降は一瞬で起動・オフラインでも遊べる
// - 素材を差し替えた時は ASSET_VER を上げる(古いキャッシュは自動で消える)
const ASSET_VER = 'tamba-assets-v82';
const PAGE_CACHE = 'tamba-page';
const CORE = ['./', 'lib/three.min.js', 'lib/GLTFLoader.js', 'lib/DRACOLoader.js',
  'lib/draco/draco_wasm_wrapper.js', 'lib/draco/draco_decoder.wasm',
  'sprites/s_hero.webp', 'art/keyart.webp', 'icons/icon-192.png'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(ASSET_VER).then(c => c.addAll(CORE.filter(u => u !== './'))).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== ASSET_VER && k !== PAGE_CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isPage = req.mode === 'navigate' || (sameOrigin && (url.pathname.endsWith('/') || url.pathname.endsWith('.html') || url.pathname.endsWith('version.json') || url.pathname.endsWith('.webmanifest')));
  if (isPage) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-store' });
        if (res.ok && req.mode === 'navigate') { const c = await caches.open(PAGE_CACHE); c.put('./', res.clone()); }
        return res;
      } catch (err) {
        const c = await caches.open(PAGE_CACHE);
        return (await c.match('./')) || Response.error();
      }
    })());
    return;
  }
  if (sameOrigin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(ASSET_VER);
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
      return res;
    })());
  }
});
