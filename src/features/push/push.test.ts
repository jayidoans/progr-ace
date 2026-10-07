import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { classifyPushResponse } from "./dispatcher";
import { decodeVapidPublicKey } from "./presentation";

test("delivery classifies success, expiry, transient and permanent responses", () => {
  for (const status of [200, 201, 202, 204]) assert.equal(classifyPushResponse(status), "DELIVERED");
  for (const status of [404, 410]) assert.equal(classifyPushResponse(status), "GONE");
  for (const status of [408, 429, 500, 503]) assert.equal(classifyPushResponse(status), "RETRY");
  for (const status of [400, 401, 403]) assert.equal(classifyPushResponse(status), "FAILED");
});

test("VAPID public key conversion preserves browser bytes", () => {
  assert.deepEqual([...decodeVapidPublicKey("AQID-_8")], [1, 2, 3, 251, 255]);
});

test("permission and browser subscription only follow an explicit click", () => {
  const source = readFileSync(join(process.cwd(), "src/features/push/push-control.tsx"), "utf8");
  assert.match(source, /const enable = async/);
  assert.match(source, /await Notification\.requestPermission\(\)/);
  assert.match(source, /onClick=\{\(\) => void enable\(\)\}/);
  assert.match(source, /await subscription\.unsubscribe\(\)/);
  assert.doesNotMatch(source, /localStorage|indexedDB/);
});

test("service worker push click uses only validated internal dashboard routes", () => {
  const source = readFileSync(join(process.cwd(), "public/service-worker.js"), "utf8");
  assert.match(source, /function safeNotificationTarget/);
  assert.match(source, /self\.addEventListener\("push"/);
  assert.match(source, /self\.addEventListener\("notificationclick"/);
  assert.match(source, /self\.clients\.openWindow\(target\)/);
  assert.match(source, /request\.mode === "navigate"/);
  assert.doesNotMatch(source, /cache\.put\(|pushManager\.subscribe\(/);
});

test("scheduled delivery is bounded and does not use Notification Center as a push trigger", () => {
  const source = readFileSync(join(process.cwd(), "src/features/push/dispatcher.ts"), "utf8");
  assert.match(source, /p_limit: 5/);
  assert.match(source, /AbortSignal\.timeout\(8000\)/);
  assert.match(source, /"Open ProgrACE to view your notification\."/);
  assert.doesNotMatch(source, /recipient_user_id|authorization.*client/i);
});
