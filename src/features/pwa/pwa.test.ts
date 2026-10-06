import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import manifest from "@/app/manifest";
import { SERVICE_WORKER_URL, shouldRegisterServiceWorker } from "./service-worker-registration";

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

test("service worker precaches only the explicit offline shell and PWA icons", () => {
  const source = readFileSync(join(process.cwd(), "public/service-worker.js"), "utf8");

  assert.match(source, /const SAFE_CACHE_PATHS = new Set/);
  assert.match(source, /"\/offline\.html"/);
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
