import assert from "node:assert/strict";
import { test } from "node:test";

import { stravaAccessActions } from "../access-state";

test("default-denied athlete cannot start OAuth or sync", () => {
  const actions = stravaAccessActions({ isAthlete: true, allowed: false, connectionStatus: null });
  assert.deepEqual(actions, {
    canAllow: true, canRevoke: false, canDisconnect: false, canConnect: false, canSync: false,
  });
});

test("allowed disconnected athlete can connect or have permission revoked", () => {
  const actions = stravaAccessActions({ isAthlete: true, allowed: true, connectionStatus: null });
  assert.equal(actions.canConnect, true);
  assert.equal(actions.canRevoke, true);
  assert.equal(actions.canDisconnect, false);
});

test("connected athlete can sync or disconnect, but not revoke permission directly", () => {
  const actions = stravaAccessActions({ isAthlete: true, allowed: true, connectionStatus: "CONNECTED" });
  assert.equal(actions.canSync, true);
  assert.equal(actions.canDisconnect, true);
  assert.equal(actions.canRevoke, false);
});

test("reconnect-needed athlete can retry OAuth but cannot sync", () => {
  const actions = stravaAccessActions({ isAthlete: true, allowed: true, connectionStatus: "REAUTH_REQUIRED" });
  assert.equal(actions.canConnect, true);
  assert.equal(actions.canSync, false);
});

test("non-athlete cannot be granted access even when another role is present", () => {
  const actions = stravaAccessActions({ isAthlete: false, allowed: false, connectionStatus: null });
  assert.equal(actions.canAllow, false);
  assert.equal(actions.canConnect, false);
});

test("inconsistent connected but denied state offers disconnect only", () => {
  const actions = stravaAccessActions({ isAthlete: true, allowed: false, connectionStatus: "CONNECTED" });
  assert.equal(actions.canDisconnect, true);
  assert.equal(actions.canSync, false);
  assert.equal(actions.canRevoke, false);
});
