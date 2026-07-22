/* ============================================================
   TRIESTE CITY WALK – Service Worker
   Gør appen offline-klar:
   - App-skallen (HTML, Leaflet, skrifttyper) caches ved installation
     og opdateres i baggrunden, når der er net (network-first).
   - Kortfliser caches første gang de ses (cache-first), og hele
     rutens område kan forudhentes via knappen i Indstillinger.
   Bump VERSION ved større ændringer for at rydde gammel app-cache.
   ============================================================ */
const VERSION = "v1";
const APP_CACHE = "trieste-app-" + VERSION;
const TILE_CACHE = "trieste-tiles-v1"; // deles med forudhentningen i index.html

const APP_ASSETS = [
  "./",
  "./index.html",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(APP_CACHE)
      .then((c) => c.addAll(APP_ASSETS))
      .catch(() => {}) // manglende net ved installation må ikke blokere
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("trieste-app-") && k !== APP_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  /* Kortfliser: cache-first (fliser ændrer sig sjældent) */
  if (url.hostname === "tile.openstreetmap.org" || url.hostname.endsWith("arcgisonline.com")) {
    e.respondWith(
      caches.open(TILE_CACHE).then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        try {
          const res = await fetch(e.request);
          if (res && (res.ok || res.type === "opaque")) c.put(e.request, res.clone());
          return res;
        } catch (err) {
          return new Response("", { status: 504 }); // offline uden cached flise
        }
      })
    );
    return;
  }

  /* Alt andet (app, biblioteker, skrifttyper): network-first,
     så opdateringer stadig slår igennem – cache som offline-fallback */
  e.respondWith(
    (async () => {
      try {
        const res = await fetch(e.request);
        if (res && res.ok && (url.protocol === "https:")) {
          const c = await caches.open(APP_CACHE);
          c.put(e.request, res.clone());
        }
        return res;
      } catch (err) {
        const hit = await caches.match(e.request, { ignoreSearch: true });
        if (hit) return hit;
        if (e.request.mode === "navigate") {
          const idx = await caches.match("./index.html");
          if (idx) return idx;
        }
        return new Response("Offline", { status: 503 });
      }
    })()
  );
});
