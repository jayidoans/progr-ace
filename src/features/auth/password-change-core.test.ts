import assert from "node:assert/strict";
import { test } from "node:test";

import { performAuthenticatedPasswordChange } from "./password-change-core";

test("successful authenticated password change clears the forced-change state", async () => {
  let cleared = false;
  const result = await performAuthenticatedPasswordChange({
    password: "NewPassword1!",
    updateAuthPassword: async () => true,
    clearRequirement: async () => { cleared = true; return true; },
  });
  assert.equal(result, "SUCCEEDED");
  assert.equal(cleared, true);
});

test("failed password update never clears the forced-change state", async () => {
  let cleared = false;
  const result = await performAuthenticatedPasswordChange({
    password: "RejectedPassword1!",
    updateAuthPassword: async () => false,
    clearRequirement: async () => { cleared = true; return true; },
  });
  assert.equal(result, "AUTH_FAILED");
  assert.equal(cleared, false);
});
