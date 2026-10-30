/* Nous ✦ — service worker
 * Généré par scripts/build-sw.mjs (ne pas éditer public/sw.js à la main).
 * Stratégies :
 *  - pages (navigations)      : réseau d'abord (timeout 4 s) → cache → /offline.html
 *  - /_next/static, icônes    : cache d'abord (fichiers versionnés, immuables)
 *  - photos Firebase Storage  : cache d'abord (URL uniques) — galerie dispo hors ligne
 *  - tuiles de carte          : stale-while-revalidate
 *  - Firestore / Auth / API   : jamais interceptés (Firestore a son propre cache)
 */
const VERSION = "__VERSION__";
const STATIC = `nous-static-${VERSION}`;
const PAGES = `nous-pages-${VERSION}`;
const IMAGES = "nous-images-v1";
const TILES = "nous-tiles-v2"; // v2 : purge des tuiles « API KEY REQUIRED »
const KEEP = [STATIC, PAGES, IMAGES, TILES];

const PRECACHE = ["/offline.html", "/icons/icon-192.png"];
const WARM_PAGES = ["/home", "/map", "/activity", "/profile", "/settings", "/stats", "/memory", "/gifts", "/bucketlist", "/capsule", "/resto", "/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const s = await caches.open(STATIC);
      await s.addAll(PRECACHE);
      const p = await caches.open(PAGES);
      await Promise.all(WARM_PAGES.map((u) => p.add(u).catch(() => {})));
    })()
  );
  // Première installation : activation immédiate. Mises à jour : on attend
  // que l'utilisateur tape « Mettre à jour » (message SKIP_WAITING).
  if (!self.registration.active) self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })()
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

async function cacheFirst(req, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === "opaque")) {
    cache.put(req, res.clone());
    if (max) trim(cacheName, max);
  }
  return res;
}

async function staleWhileRevalidate(req, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const net = fetch(req)
    .then((res) => {
      if (res && (res.ok || res.type === "opaque")) {
        cache.put(req, res.clone());
        if (max) trim(cacheName, max);
      }
      return res;
    })
    .catch(() => hit);
  return hit || net;
}

async function networkFirst(event, cacheName, timeoutMs, fallbackUrl) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const network = (async () => {
    const preload = event.preloadResponse ? await event.preloadResponse : null;
    const res = preload || (await fetch(req));
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  })();
  network.catch(() => {});

  try {
    if (!timeoutMs) return await network;
    return await Promise.race([
      network,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
  } catch {
    const hit = (await cache.match(req, { ignoreSearch: true })) || (await cache.match(new URL(req.url).pathname));
    if (hit) return hit;
    try {
      return await network;
    } catch {
      if (fallbackUrl) return (await caches.match(fallbackUrl)) || Response.error();
      return Response.error();
    }
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (url.pathname === "/sw.js") return;
    if (
      url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/splash/") ||
      /\.(?:png|svg|ico|woff2?)$/.test(url.pathname)
    ) {
      event.respondWith(cacheFirst(req, STATIC));
      return;
    }
    if (req.mode === "navigate") {
      event.respondWith(networkFirst(event, PAGES, 4000, "/offline.html"));
      return;
    }
    if (url.searchParams.has("_rsc") || req.headers.get("RSC") === "1") {
      event.respondWith(networkFirst(event, PAGES, 0, null));
      return;
    }
    return;
  }

  if (url.hostname === "firebasestorage.googleapis.com" || url.hostname.endsWith(".firebasestorage.app")) {
    // Uniquement les fichiers (alt=media), pas les métadonnées
    if (url.searchParams.get("alt") === "media") event.respondWith(cacheFirst(req, IMAGES, 400));
    return;
  }

  if (url.hostname === "tile.openstreetmap.org") {
    event.respondWith(staleWhileRevalidate(req, TILES, 800));
  }
});
