import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import manifest from "@/app/manifest";
import { getInstallAvailability, shouldBlockOfflineFormSubmission } from "./presentation";
import {
  SERVICE_WORKER_UPDATE_INTERVAL_MS,
  SERVICE_WORKER_URL,
  shouldRegisterServiceWorker,
} from "./service-worker-registration";

test("the native manifest configures an installable standalone ProgrACE app", () => {
  const value = manifest();

  assert.equal(value.name, "ProgrACE");
  assert.equal(value.short_name, "ProgrACE");
  assert.equal(value.start_url, "/dashboard");
  assert.equal(value.display, "standalone");
  assert.deepEqual(value.icons?.map((icon) => icon.src), [
    "/icons/prograce-192.png",
    "/icons/prograce-512.png",
    "/icons/prograce-maskable-512.png",
  ]);
});

test("service worker registration is a production-only progressive enhancement", () => {
  assert.equal(SERVICE_WORKER_URL, "/service-worker.js");
  assert.equal(shouldRegisterServiceWorker(true, "production"), true);
  assert.equal(shouldRegisterServiceWorker(false, "production"), false);
  assert.equal(shouldRegisterServiceWorker(true, "development"), false);
});

test("PWA update checks use the six-hour freshness window", () => {
  assert.equal(SERVICE_WORKER_UPDATE_INTERVAL_MS, 6 * 60 * 60 * 1000);
});

test("install is discoverable only when an explicit browser capability is available", () => {
  assert.equal(getInstallAvailability({ hasDeferredPrompt: true, isIos: false, isStandalone: false }), "chromium");
  assert.equal(getInstallAvailability({ hasDeferredPrompt: false, isIos: true, isStandalone: false }), "ios");
  assert.equal(getInstallAvailability({ hasDeferredPrompt: false, isIos: false, isStandalone: false }), "none");
  assert.equal(getInstallAvailability({ hasDeferredPrompt: true, isIos: true, isStandalone: true }), "none");
});

test("offline state blocks only non-GET form submissions and never queues them", () => {
  assert.equal(shouldBlockOfflineFormSubmission(false, "post"), true);
  assert.equal(shouldBlockOfflineFormSubmission(false, "POST"), true);
  assert.equal(shouldBlockOfflineFormSubmission(false, "get"), false);
  assert.equal(shouldBlockOfflineFormSubmission(true, "post"), false);
});

test("native installation and iOS guidance both require explicit interaction", () => {
  const experienceSource = readFileSync(join(process.cwd(), "src/features/pwa/pwa-experience.tsx"), "utf8");
  const installControlSource = readFileSync(join(process.cwd(), "src/features/pwa/install-prograce-control.tsx"), "utf8");

  assert.match(experienceSource, /event\.preventDefault\(\);\s*setDeferredPrompt/);
  assert.match(experienceSource, /const install = useCallback/);
  assert.match(installControlSource, /onClick=\{openInstall\}/);
  assert.match(installControlSource, /Add to Home Screen/);
});

test("service worker precaches only the explicit offline shell and PWA icons", () => {
  const source = readFileSync(join(process.cwd(), "public/service-worker.js"), "utf8");

  assert.match(source, /const SAFE_CACHE_PATHS = new Set/);
  assert.match(source, /"\/offline\.html"/);
  assert.match(source, /"\/offline\.js"/);
  assert.match(source, /"\/icons\/prograce-192\.png"/);
  assert.doesNotMatch(source, /cache\.put\(/);
  assert.doesNotMatch(source, /request\.method === "GET"\)\s*\{\s*event\.respondWith\(caches\.match/);
});

test("service worker keeps application navigation network-dependent and falls back safely", () => {
  const source = readFileSync(join(process.cwd(), "public/service-worker.js"), "utf8");

  assert.match(source, /request\.mode === "navigate"/);
  assert.match(source, /fetch\(request\)\.catch\(\(\) => getOfflineResponse\(\)\)/);
  assert.doesNotMatch(source, /\/dashboard.*caches\.match/);
});

test("service worker update protocol carries only an explicit activation request", () => {
  const source = readFileSync(join(process.cwd(), "public/service-worker.js"), "utf8");

  assert.match(source, /event\.data\?\.type === "SKIP_WAITING"/);
  assert.match(source, /self\.skipWaiting\(\)/);
  assert.doesNotMatch(source, /token|authorization|athlete|coach/i);
});

test("standalone PWA zoom lock is scoped to the PWA experience", () => {
  const source = readFileSync(join(process.cwd(), "src/features/pwa/pwa-experience.tsx"), "utf8");
  const styles = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  assert.match(source, /pwa-standalone/);
  assert.match(source, /maximum-scale=1, user-scalable=no/);
  assert.match(source, /gesturestart/);
  assert.match(source, /touches\.length > 1/);
  assert.match(styles, /display-mode: standalone/);
  assert.match(styles, /font-size: 16px/);
});

test("offline page retries the normal online entry point after ten seconds", () => {
  const source = readFileSync(join(process.cwd(), "public/offline.js"), "utf8");

  assert.match(source, /window\.setTimeout/);
  assert.match(source, /10_000/);
  assert.match(source, /window\.location\.assign\("\/dashboard"\)/);
});
