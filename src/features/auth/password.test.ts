import assert from "node:assert/strict";
import { test } from "node:test";

import { generateTemporaryPassword, passwordChangeSchema } from "./password";

test("password change validation accepts the existing 8-72 character policy", () => {
  assert.equal(passwordChangeSchema.safeParse({ password: "long-enough", confirmPassword: "long-enough" }).success, true);
  assert.equal(passwordChangeSchema.safeParse({ password: "short", confirmPassword: "short" }).success, false);
});

test("password mismatch is rejected", () => {
  assert.equal(passwordChangeSchema.safeParse({ password: "password-one", confirmPassword: "password-two" }).success, false);
});

test("temporary password is generated from supplied cryptographic bytes and includes required classes", () => {
  const password = generateTemporaryPassword(new Uint8Array(18).fill(7));
  assert.equal(password.length, 22);
  assert.match(password, /[A-Z]/);
  assert.match(password, /[a-z]/);
  assert.match(password, /[0-9]/);
  assert.match(password, /[^A-Za-z0-9]/);
});
