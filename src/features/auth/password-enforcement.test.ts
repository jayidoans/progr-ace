import assert from "node:assert/strict";
import { test } from "node:test";

import {
  PASSWORD_STATUS_UNAVAILABLE_PATH,
  passwordGateRedirectPath,
  REQUIRED_PASSWORD_CHANGE_PATH,
  requiresPasswordGate,
} from "./password-enforcement";

test("normal authenticated application routes are gated", () => {
  assert.equal(requiresPasswordGate("/dashboard"), true);
  assert.equal(requiresPasswordGate("/dashboard/activities"), true);
  assert.equal(requiresPasswordGate("/api/strava/connect"), true);
});

test("password-change, auth, and public routes avoid redirect loops", () => {
  assert.equal(requiresPasswordGate("/account/change-password"), false);
  assert.equal(requiresPasswordGate(PASSWORD_STATUS_UNAVAILABLE_PATH), false);
  assert.equal(requiresPasswordGate("/login"), false);
  assert.equal(requiresPasswordGate("/auth/callback"), false);
});

test("password status failures do not masquerade as a forced password change", () => {
  assert.equal(passwordGateRedirectPath({ mustChangePassword: false, passwordStatusUnavailable: true }), PASSWORD_STATUS_UNAVAILABLE_PATH);
  assert.equal(passwordGateRedirectPath({ mustChangePassword: true, passwordStatusUnavailable: false }), REQUIRED_PASSWORD_CHANGE_PATH);
  assert.equal(passwordGateRedirectPath({ mustChangePassword: false, passwordStatusUnavailable: false }), null);
});
