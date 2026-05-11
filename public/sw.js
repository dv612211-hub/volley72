/* eslint-disable */
const CACHE = "volley72-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache HTML — always go to network. This prevents stale HTML
  // from hydrating against a fresh client bundle.
  if (
    req.destination === "document" ||
    req.headers.get("accept")?.includes("text/html")
  ) {
    return; // browser handles HTML normally; no SW interception
  }

  // API: network-only
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkOnly(req));
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    /\.(woff2?|ttf|css|js|mjs|png|jpe?g|svg|ico|webp|avif)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req));
    return;
  }
});

async function networkOnly(req) {
  try {
    return await fetch(req);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "offline", offline: true }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok && (res.type === "basic" || res.type === "cors")) {
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    return new Response("offline asset", { status: 503 });
  }
}

