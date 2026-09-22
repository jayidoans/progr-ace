import assert from "node:assert/strict";
import test from "node:test";

import { resolveActiveMode, switchableModes } from "./active-mode";

test("dual-role users default to Athlete and can restore Coach", () => {
  assert.equal(resolveActiveMode(["ATHLETE", "COACH"]), "ATHLETE");
  assert.equal(resolveActiveMode(["ATHLETE", "COACH"], "COACH"), "COACH");
  assert.deepEqual(switchableModes(["ATHLETE", "COACH"]), ["ATHLETE", "COACH"]);
});

test("stored modes cannot grant a role the user does not own", () => {
  assert.equal(resolveActiveMode(["ATHLETE"], "COACH"), "ATHLETE");
  assert.equal(resolveActiveMode(["COACH"], "ATHLETE"), "COACH");
  assert.equal(resolveActiveMode(["ADMIN"], "COACH"), "ADMIN");
  assert.equal(resolveActiveMode(["ADMIN", "ATHLETE"]), "ADMIN");
  assert.equal(resolveActiveMode(["ADMIN", "ATHLETE", "COACH"], "ADMIN"), "ADMIN");
  assert.deepEqual(switchableModes(["ADMIN"]), ["ADMIN"]);
  assert.deepEqual(switchableModes(["ADMIN", "ATHLETE", "COACH"]), ["ATHLETE", "COACH", "ADMIN"]);
});
