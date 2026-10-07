# M17.2 — Web Push and publication notifications

M17.1 application notifications remain the durable source of truth. Web Push is an optional, online delivery channel; disabling it does not disable the Notification Center. No training-domain transition waits for a push endpoint. No training data or notifications are cached by the PWA service worker.

## Publication events

- `PROGRAM_PUBLISHED`: the first `DRAFT` → `PUBLISHED` Training Program transition notifies its assigned Athlete once. The existing Program lifecycle also publishes its initial weeks; those do not create week notifications.
- `WEEKLY_PLAN_PUBLISHED`: a later `DRAFT` → `PUBLISHED` Training Week transition in an already published Program notifies the assigned Athlete once, provided its end date has not passed. Historical weeks remain publishable under M11.3, but do not create a burst of stale alerts.

Both are created atomically by database triggers with stable unique event keys. Recipients come from Program → Race Goal → Athlete, never the browser. The content uses a snapshot of restrained, generic copy and an existing internal training route. Failed or repeated transitions create no second notification. Publication does not change `tracking_start_date`, compliance, or race semantics.

## Subscription and delivery

`push_subscriptions` stores one row per browser endpoint, with the owning user, browser push encryption keys, revocation and timestamps. An endpoint is unique and cannot be silently reassigned to another account. A user may have up to five active devices. Direct client table access is denied, including for ordinary Admin sessions; authenticated RPCs use `auth.uid()` to register, check and revoke the current user's endpoint. Sign-out revokes every active endpoint for that account before ending the session, prioritizing shared-device privacy even when browser unsubscribe is unavailable. This also disables push on the user's other devices; those devices can enable it again in Profile. The browser control unsubscribes a stale endpoint before enabling for a different account.

`push_deliveries` is the durable outbox. The notification insert trigger creates rows for then-active devices in the same transaction. The scheduled Worker claims at most five due deliveries per minute with a two-minute lease and sends sequentially. It never scans all notifications on page requests. Push failures leave the domain transition and Notification Center record intact. HTTP 404/410 revokes an expired endpoint; HTTP 408/429/5xx or network errors retry with bounded backoff, up to three attempts. Other failures are final. Delivery can be duplicated if a lease expires after an endpoint accepted the push but before the database acknowledgement; OS display is not guaranteed exactly once.

The OS payload contains only notification ID, generic title/body and a validated internal target. It contains no token, training metrics or detailed Athlete data. The service worker validates the path again and relies on normal authentication/RLS when opening the page. Service-worker fetch caching remains limited to the M16 offline document and icons. Notification Center content is network-dependent.

## Permission and platforms

Profile offers explicit Enable/Disable Push Notifications actions. Permission is never requested on page load. Unsupported browsers, denied permissions and missing service workers show explanatory states. iPhone/iPad users are directed to the installed Home Screen app; ordinary Safari tabs are not promised push support. Browser permission and ProgrACE subscription state are separate.

## Configuration and deployment order

This milestone adds one Cloudflare Cron Trigger (`* * * * *`) and a small custom OpenNext Worker entrypoint that preserves OpenNext's fetch handler. No Queue is required. The dispatcher uses `@block65/webcrypto-web-push` (Web Crypto-compatible VAPID and `aes128gcm` payload encryption), Supabase service-role access, and a bounded batch. This is an infrastructure change: deploy only after reviewing Cron availability/cost for the Cloudflare account.

Required server/Worker variables: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:` contact or HTTPS URL). Configure the same public VAPID key for browser subscriptions and server delivery. Generate the VAPID key pair securely; never commit the private key. Store private values in Cloudflare secrets. Existing `keep_vars` remains enabled. The push endpoints are constrained to known browser push providers to reduce SSRF exposure.

Production order: (1) back up and apply `20261007110000_web_push_publication.sql` through normal Supabase migration workflow; (2) configure the VAPID and Supabase Worker secrets; (3) deploy the OpenNext Worker with Cron Trigger; (4) perform device tests. This task does none of those production steps.

Smoke test: enable push on Android/Desktop Chromium, submit a Claim and confirm Notification Center plus OS alert, publish a first Program and verify one Program alert (not a duplicate Week alert), publish a later Week and verify one Week alert, then disable push and confirm Notification Center still works. On iPhone/iPad, install to Home Screen before enabling. Test offline/reconnect and sign-out as Athlete A, then sign in as Athlete B on the same device: A's application data must not appear and A's endpoint must no longer receive alerts. Test invalid endpoint cleanup and a temporary endpoint failure without domain rollback.

M17.3 training reminders, scheduling of prescriptions, and broader notification preferences are deferred.
