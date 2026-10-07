/*
 * ProgrACE is online-first. This worker intentionally caches only the offline
 * document and PWA icons. It never caches dashboard, auth, API, or mutation
 * responses, so user-specific training data cannot survive a logout.
 */
const CACHE_NAME = "prograce-online-shell-v2";
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
    caches.open(CACHE_NAME).then((cache) => cache.addAll([...SAFE_CACHE_PATHS])),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
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

function safeNotificationTarget(path) {
  return typeof path === "string" && /^\/dashboard(?:\/[a-zA-Z0-9_-]+)*$/.test(path)
    ? path : "/dashboard";
}

self.addEventListener("push", (event) => {
  let payload;
  try { payload = event.data?.json(); } catch { payload = null; }
  const title = typeof payload?.title === "string" && payload.title.length <= 160
    ? payload.title : "ProgrACE notification";
  const body = typeof payload?.body === "string" && payload.body.length <= 180
    ? payload.body : "Open ProgrACE to view your notification.";
  const notificationId = typeof payload?.id === "string" && /^[0-9a-f-]{36}$/i.test(payload.id)
    ? payload.id : undefined;
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: "/icons/prograce-192.png",
    tag: notificationId,
    data: { targetPath: safeNotificationTarget(payload?.targetPath) },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = safeNotificationTarget(event.notification.data?.targetPath);
  const target = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(target);
      return existing.focus();
    }
    return self.clients.openWindow(target);
  })());
});
