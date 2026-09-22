import assert from "node:assert/strict";
import { test } from "node:test";

import { adminRoleBadgeClass, summarizeAdminUsers } from "./summary";

const users = [
  { userId: "one", roles: ["ATHLETE", "COACH"], stravaConnected: true },
  { userId: "two", roles: ["ATHLETE"], stravaConnected: false },
  { userId: "three", roles: ["COACH"], stravaConnected: true },
];

test("summary independently counts multi-role users and connected athletes", () => {
  assert.deepEqual(summarizeAdminUsers(users), {
    accounts: 3, athletes: 2, coaches: 2, stravaConnectedAthletes: 1,
  });
});

test("only a connected ATHLETE badge is orange", () => {
  assert.match(adminRoleBadgeClass("ATHLETE", true), /orange/);
  assert.doesNotMatch(adminRoleBadgeClass("ATHLETE", false), /orange/);
  assert.doesNotMatch(adminRoleBadgeClass("COACH", true), /orange/);
});
