import assert from "node:assert/strict";
import { test } from "node:test";

import { requiresPasswordGate } from "./password-enforcement";

test("normal authenticated application routes are gated", () => {
  assert.equal(requiresPasswordGate("/dashboard"), true);
  assert.equal(requiresPasswordGate("/dashboard/activities"), true);
  assert.equal(requiresPasswordGate("/api/strava/connect"), true);
});

test("password-change, auth, and public routes avoid redirect loops", () => {
  assert.equal(requiresPasswordGate("/account/change-password"), false);
  assert.equal(requiresPasswordGate("/login"), false);
  assert.equal(requiresPasswordGate("/auth/callback"), false);
});
