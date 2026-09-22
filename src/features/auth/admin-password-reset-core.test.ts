import assert from "node:assert/strict";
import { test } from "node:test";

import { performAdminPasswordReset } from "./admin-password-reset-core";

test("admin reset marks forced change before updating Auth and returns password once", async () => {
  const sequence: string[] = [];
  const result = await performAdminPasswordReset(
    { adminUserId: "admin", targetUserId: "target", wasRequired: false },
    {
      generatePassword: () => "Temporary1!",
      setRequired: async (required) => { sequence.push(`required:${required}`); return true; },
      updateAuthPassword: async (password) => { sequence.push(`password:${password}`); return true; },
    },
  );
  assert.deepEqual(sequence, ["required:true", "password:Temporary1!"]);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.temporaryPassword, "Temporary1!");
});

test("admin self-reset is rejected without generating or changing a password", async () => {
  let touched = false;
  const result = await performAdminPasswordReset(
    { adminUserId: "same", targetUserId: "same", wasRequired: false },
    { generatePassword: () => { touched = true; return "x"; }, setRequired: async () => true, updateAuthPassword: async () => true },
  );
  assert.equal(result.ok, false);
  assert.equal(touched, false);
});

test("failed Auth update rolls back a newly-added forced-change flag", async () => {
  const states: boolean[] = [];
  const result = await performAdminPasswordReset(
    { adminUserId: "admin", targetUserId: "target", wasRequired: false },
    { generatePassword: () => "Temporary1!", setRequired: async (value) => { states.push(value); return true; }, updateAuthPassword: async () => false },
  );
  assert.equal(result.ok, false);
  assert.deepEqual(states, [true, false]);
});
