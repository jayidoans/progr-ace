/*
 * ProgrACE is online-first. This worker intentionally caches only the offline
 * document and PWA icons. It never caches dashboard, auth, API, or mutation
 * responses, so user-specific training data cannot survive a logout.
 */
const CACHE_NAME = "prograce-online-shell-v1";
const OFFLINE_URL = "/offline.html";
const SAFE_CACHE_PATHS = new Set([
  OFFLINE_URL,
  "/offline.js",
  "/icons/prograce-192.png",
  "/icons/prograce-512.png",
  "/icons/prograce-maskable-512.png",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([...SAFE_CACHE_PATHS])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith("prograce-online-shell-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

function getOfflineResponse() {
  return caches.match(OFFLINE_URL);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (SAFE_CACHE_PATHS.has(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
    return;
  }

  // All navigation stays network-dependent, including /dashboard and auth routes.
  // The offline page is a fallback only after a network request fails.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => getOfflineResponse()));
  }
});
