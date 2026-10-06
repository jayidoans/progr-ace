# M16.2 — PWA Experience & Polish

## Objective

M16.2 makes the existing online-first ProgrACE PWA easier to discover and safer to use as an installed application. Installation remains optional: normal browser use is fully supported and no install banner or automatic prompt appears on first visit or during login.

ProgrACE remains online-first. No authenticated training data is available offline, and no offline Activity, Claim, Coach action, mutation queue, background sync, or IndexedDB application-data storage exists.

## Optional installation

The **Install ProgrACE** action appears only in the authenticated **Profile** page, next to other personal application settings. It is shown only after browser capability detection completes:

- Chromium browsers that emit `beforeinstallprompt` show an action that invokes the native prompt only after the user clicks it.
- iOS/iPadOS browsers show concise Add to Home Screen guidance only after the user clicks the action.
- Standalone-installed contexts and browsers with neither path show no install action.

The browser prompt event is held only in React memory for the current page. It is never persisted. Once the native prompt is accepted or dismissed, the action is removed for that page session.

## Standalone and connection awareness

PWA presentation detects standalone display through supported display-mode/media-query APIs and the compatible iOS standalone flag. This affects only install affordances; it never affects roles, authorization, Supabase session behavior, or application features.

When an already-open app loses network connectivity, a compact status notice explains that some ProgrACE features are unavailable. When connectivity returns, a temporary **Back online** notice appears. Existing visible content is not replaced with a cached dashboard, and reconnecting never resubmits an earlier failed action.

For non-GET form submissions while `navigator.onLine` is false, the shared PWA boundary prevents submission and leaves the user on the current page with the offline notice. It does not queue, persist, or retry mutations automatically. GET navigation is not intercepted by this form safeguard.

## Update behavior

The service worker cache remains limited to the offline document, its retry script, and PWA icons. M16.2 does not cache dashboard pages, API responses, Supabase responses, tokens, authentication, or training data.

The service worker no longer immediately calls `skipWaiting` during an update. If a newer worker is waiting while an existing worker controls the page, a compact **An update to ProgrACE is available** notice appears. The user may choose **Update**, which sends only `{ type: "SKIP_WAITING" }` to the waiting worker. The page reloads once after `controllerchange`; there is no automatic reload and no update loop. Choosing **Later** hides the notice for the current page.

The cache name is versioned and obsolete `prograce-online-shell-*` caches are removed during activation.

## Security boundaries

No PWA UI state stores or transmits Supabase tokens, Strava tokens, service-role credentials, Athlete or Coach data, role decisions, or ownership decisions. Service-worker messaging is limited to the activation command above. Existing Supabase authentication, RLS, server-side authorization, Active Mode, Strava OAuth, start URL, login, logout, password-change, and redirect flows remain unchanged.

## Graceful degradation

Browser APIs are feature-detected. Browsers that do not support install prompting continue to use ProgrACE normally without a broken installation control. iOS uses user-triggered instructions rather than unsupported programmatic installation.

## Production smoke test

### Android / Chromium

1. Use ProgrACE normally in a browser; confirm no automatic install prompt appears.
2. Sign in, open **Profile**, choose **Install ProgrACE**, accept the browser prompt, and launch the installed app.
3. Confirm the install action is absent in standalone mode.
4. Disconnect while the app remains open; confirm the offline notice appears, and a normal form submission remains on the current page without being queued.
5. Reconnect; confirm **Back online** appears and explicitly retry the previously blocked action if desired.
6. Reload while offline and confirm the static offline fallback contains no user data.
7. Deploy a later worker, confirm the update notice, choose **Update**, and verify one reload only.

### iOS / iPadOS Safari

1. Sign in, open **Profile**, select **Install ProgrACE**, and confirm instructions appear only after the selection.
2. Use Safari Share → Add to Home Screen, launch from the Home Screen, and verify the install action is hidden.
3. Confirm header, navigation, dialogs, forms, and bottom status notices respect safe areas.
4. Test offline and reconnect behavior as above.

### Desktop Chromium and shared devices

1. Confirm Profile exposes installation only where supported, then install and launch standalone.
2. Athlete A logs in and uses the app, logs out, then Athlete B logs in. Confirm no Athlete A training data appears from a PWA cache.

## Deferred work

M16.2 deliberately does not add custom install marketing, push notifications, notification permissions, background sync, offline training data, offline mutations, data caching, conflict resolution, or automatic retry/resubmission of failed actions.
