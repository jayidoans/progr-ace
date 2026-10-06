# M16.1 — Online-First Progressive Web App Foundation

## Objective

M16.1 makes ProgrACE installable as a branded, standalone Progressive Web App while preserving the existing online application architecture:

Next.js App Router → OpenNext → Cloudflare Workers → Supabase.

Installing ProgrACE does **not** mean that training data is available offline. Authoritative application data continues to require a network connection.

## Manifest and icons

`app/manifest.ts` uses the Next.js App Router manifest convention and provides the ProgrACE name, standalone display mode, `/dashboard` start URL, brand colors, and 192×192, 512×512, and maskable 512×512 icons. The icons are derived from the existing ProgrACE icon asset; no new brand identity was introduced.

The root metadata adds the application name, manifest association, current icon metadata, Apple Home Screen metadata, and viewport/theme settings. `/dashboard` remains a safe entry point because the existing authentication flow redirects unauthenticated users through its normal login path.

## Online-first service worker

`public/service-worker.js` is intentionally small. It precaches only:

- the static offline document;
- PWA icons.

It does not cache Next.js pages, dashboard responses, API responses, Supabase responses, authentication endpoints, session/token data, Server Action responses, or mutations. Normal navigation is always network-first. When a navigation cannot reach the network, the worker returns only the static offline fallback.

This avoids exposing one user’s cached training data after logout and login by another user on the same device.

## Offline fallback

`public/offline.html` is a small branded document with no athlete, coach, training, or authentication data. It tells the user that an internet connection is required and provides a **Try Again** link to the regular dashboard entry point. Its small, explicitly cached retry script attempts that same online entry point every 10 seconds; if the connection is still unavailable, the service worker returns the same safe fallback again.

## Updates and Cloudflare

The service worker has a versioned offline-shell cache and deletes obsolete ProgrACE PWA caches during activation. It uses `skipWaiting` and claims clients so a new deployed service worker can take effect without an indefinite old-release cache. Its HTTP response is marked `no-cache` through `public/_headers` so browsers revalidate it.

The implementation uses only App Router metadata, public static assets, and a small client registration component. It adds no PWA dependency and requires no Vercel runtime behavior, migration, RPC, schema change, RLS change, or Supabase change. `middleware.ts` excludes the PWA static resources so manifest/icon/service-worker retrieval does not unnecessarily run session refresh middleware.

## Authentication and authorization safety

PWA behavior does not decide roles or access. Existing Supabase authentication, roles, RLS, domain authorization, and Active Mode behavior remain authoritative. The service worker never stores access tokens, refresh tokens, service-role credentials, Strava credentials, or authorization decisions.

## Testing

Focused tests verify manifest configuration, production-only registration, explicit limited precache paths, and network-dependent navigation with a safe offline fallback. Standard domain regressions remain applicable because M16.1 changes no domain code.

Suggested production smoke test:

1. On Android/Chromium, visit ProgrACE over HTTPS, confirm browser installation is offered, install it, launch it standalone, log in, and use normal Athlete and Coach flows.
2. Disconnect the network and navigate or reload a page. Confirm only the offline message appears; no stale dashboard or training data must appear.
3. Reconnect and use **Try Again**. Confirm normal authenticated behavior resumes.
4. On iPhone/iPad Safari, use **Add to Home Screen**, launch from the Home Screen, verify standalone presentation, session behavior, offline fallback, and recovery after reconnecting.
5. On desktop Chromium, verify the browser install option and standalone launch if supported.
6. Verify shared-device safety: Athlete A logs in and uses the app, logs out, Athlete B logs in, and no Athlete A data appears from a service-worker cache.

## Deferred to M16.2

M16.1 intentionally does not include a custom install prompt, update-available UI, push notifications, reminder notifications, background sync, offline training data, offline mutations, mutation queues, IndexedDB application-data persistence, or any offline conflict-resolution behavior.
