import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { inspectDevicePushForSignOut } from "./device-logout";
import { performDeviceScopedLogout } from "./logout-operation";

const endpoint = "https://fcm.googleapis.com/fcm/send/device-a";

function workerWithSubscription(unsubscribe: () => Promise<boolean>) {
  return {
    getRegistration: async () => ({
      pushManager: { getSubscription: async () => ({ endpoint, unsubscribe }) },
    }),
  } as unknown as Pick<ServiceWorkerContainer, "getRegistration">;
}

test("a browser without an active subscription leaves other devices untouched", async () => {
  assert.deepEqual(await inspectDevicePushForSignOut(null, async () => false), { state: "NONE", endpoint: "" });
  const worker = { getRegistration: async () => undefined } as Pick<ServiceWorkerContainer, "getRegistration">;
  assert.deepEqual(await inspectDevicePushForSignOut(worker, async () => false), { state: "NONE", endpoint: "" });
});

test("current account endpoint is selected without relying on browser unsubscribe", async () => {
  let unsubscribed = false;
  const device = await inspectDevicePushForSignOut(workerWithSubscription(async () => {
    unsubscribed = true;
    return true;
  }), async () => true);
  assert.deepEqual(device, { state: "SUBSCRIBED", endpoint });
  assert.equal(unsubscribed, false);
});

test("stale endpoint from another account must be removed before sign-out", async () => {
  let unsubscribed = false;
  const device = await inspectDevicePushForSignOut(workerWithSubscription(async () => {
    unsubscribed = true;
    return true;
  }), async () => false);
  assert.equal(unsubscribed, true);
  assert.deepEqual(device, { state: "NONE", endpoint: "" });
});

test("failed stale unsubscribe blocks sign-out instead of risking cross-account delivery", async () => {
  await assert.rejects(
    inspectDevicePushForSignOut(workerWithSubscription(async () => false), async () => false),
    /could not be removed/,
  );
});

test("unknown endpoint ownership is treated as stale and requires browser removal", async () => {
  await assert.rejects(
    inspectDevicePushForSignOut(workerWithSubscription(async () => false), async () => { throw Error("network"); }),
    /could not be removed/,
  );
});

test("browser inspection failure is not mistaken for no subscription", async () => {
  const worker = { getRegistration: async () => { throw Error("browser unavailable"); } } as unknown as Pick<ServiceWorkerContainer, "getRegistration">;
  await assert.rejects(inspectDevicePushForSignOut(worker, async () => false), /browser unavailable/);
});

test("ordinary sign-out uses authenticated endpoint revocation and local Auth scope", () => {
  const source = readFileSync(join(process.cwd(), "src/features/auth/actions.ts"), "utf8");
  assert.match(source, /supabase\.rpc\("revoke_push_subscription"/);
  assert.match(source, /supabase\.auth\.signOut\(\{ scope: "local" \}\)/);
  assert.doesNotMatch(source, /supabase\.rpc\("revoke_all_push_subscriptions"/);
});

test("failed endpoint revocation prevents session sign-out", async () => {
  let signedOut = false;
  const result = await performDeviceScopedLogout("SUBSCRIBED", endpoint,
    async () => false,
    async () => { signedOut = true; return true; });
  assert.equal(result, "REVOKE_FAILED");
  assert.equal(signedOut, false);
});

test("a thrown revocation failure also prevents session sign-out", async () => {
  let signedOut = false;
  const result = await performDeviceScopedLogout("SUBSCRIBED", endpoint,
    async () => { throw Error("network unavailable"); },
    async () => { signedOut = true; return true; });
  assert.equal(result, "REVOKE_FAILED");
  assert.equal(signedOut, false);
});

test("a known device revokes only its endpoint before local sign-out", async () => {
  const calls: string[] = [];
  const result = await performDeviceScopedLogout("SUBSCRIBED", endpoint,
    async (value) => { calls.push(`revoke:${value}`); return true; },
    async () => { calls.push("local-signout"); return true; });
  assert.equal(result, "DONE");
  assert.deepEqual(calls, [`revoke:${endpoint}`, "local-signout"]);
});

test("a browser with no subscription signs out without revoking other devices", async () => {
  let revoked = false;
  const result = await performDeviceScopedLogout("NONE", "",
    async () => { revoked = true; return true; }, async () => true);
  assert.equal(result, "DONE");
  assert.equal(revoked, false);
});

test("unverified or malformed device identity fails closed", async () => {
  let signedOut = false;
  const signOut = async () => { signedOut = true; return true; };
  assert.equal(await performDeviceScopedLogout("UNVERIFIED", "", async () => true, signOut), "UNVERIFIED");
  assert.equal(await performDeviceScopedLogout("SUBSCRIBED", "short", async () => true, signOut), "UNVERIFIED");
  assert.equal(signedOut, false);
});
