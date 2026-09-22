import assert from "node:assert/strict";
import test from "node:test";

import { filterAdminUsers } from "./directory";

const users = [
  { userId: "one", fullName: "Runner One", email: "one@example.test", roles: ["ATHLETE"] },
  { userId: "two", fullName: "Coach Two", email: "two@example.test", roles: ["ATHLETE", "COACH", "ADMIN"] },
];

test("searches name and email without changing role assignments", () => {
  assert.deepEqual(filterAdminUsers(users, "runner").map((user) => user.userId), ["one"]);
  assert.deepEqual(filterAdminUsers(users, "TWO@EXAMPLE").map((user) => user.userId), ["two"]);
  assert.deepEqual(filterAdminUsers(users, "  "), users);
  assert.deepEqual(filterAdminUsers(users, "missing"), []);
  assert.deepEqual(users[1].roles, ["ATHLETE", "COACH", "ADMIN"]);
});
