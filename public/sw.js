/**
 * InvoiceFlow Service Worker
 *
 * Cache strategies:
 *  /_next/static/*  → CacheFirst  (content-hashed, immutable forever)
 *  fonts            → CacheFirst  (long-lived, self-hosted via next/font)
 *  images           → CacheFirst  (stale is fine for logos/icons)
 *  /api/*           → NetworkOnly (always fresh auth + data)
 *  page navigations → StaleWhileRevalidate (instant from cache, updated in bg)
 */

const STATIC_CACHE = "if-static-v1";
const PAGE_CACHE = "if-pages-v1";
const IMAGE_CACHE = "if-images-v1";
const ALL_CACHES = [STATIC_CACHE, PAGE_CACHE, IMAGE_CACHE];

// ── Lifecycle ──────────────────────────────────────────────────────────────

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !ALL_CACHES.includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch routing ──────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Different origin (Supabase, AI APIs, etc.) — skip
  if (url.origin !== self.location.origin) return;

  // Next.js immutable static chunks — always cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Self-hosted fonts (/_next/static/media/*.woff2) already covered above.
  // Catch any other font files just in case.
  if (/\.(woff2?|ttf|otf|eot)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Images — cache-first, they rarely change
  if (/\.(png|jpe?g|gif|svg|ico|webp|avif)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // API routes — network-only, never cache auth/data responses
  if (url.pathname.startsWith("/api/")) return;

  // Page navigations — stale-while-revalidate for instant feel
  if (request.mode === "navigate") {
    event.respondWith(staleWhileRevalidate(request, PAGE_CACHE));
    return;
  }

  // Everything else (e.g. RSC payloads, _next/data) — network-first
  event.respondWith(networkFirst(request, PAGE_CACHE));
});

// ── Strategy helpers ───────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Always kick off a network refresh in the background
  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  // Return cache instantly if we have it; otherwise wait for network
  return cached ?? (await networkFetch) ?? new Response("Offline", { status: 503 });
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? new Response("Offline", { status: 503 });
  }
}
