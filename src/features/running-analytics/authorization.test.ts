import assert from "node:assert/strict";
import test from "node:test";

import { canReadProgramRunningAnalytics } from "./authorization";

const access = {
  userId: "athlete-1",
  roles: ["ATHLETE"],
  programStatus: "PUBLISHED",
  programCreatedBy: "coach-1",
  athleteId: "athlete-1",
};

test("Athlete can read only their own published Program analytics", () => {
  assert.equal(canReadProgramRunningAnalytics(access), true);
  assert.equal(canReadProgramRunningAnalytics({ ...access, athleteId: "athlete-2" }), false);
  assert.equal(canReadProgramRunningAnalytics({ ...access, programStatus: "ARCHIVED" }), false);
});

test("Coach access follows Training Program ownership", () => {
  assert.equal(canReadProgramRunningAnalytics({
    ...access,
    userId: "coach-1",
    roles: ["COACH"],
  }), true);
  assert.equal(canReadProgramRunningAnalytics({
    ...access,
    userId: "coach-2",
    roles: ["COACH"],
  }), false);
});

test("Admin retains authorized access and active mode is irrelevant", () => {
  assert.equal(canReadProgramRunningAnalytics({
    ...access,
    userId: "admin-1",
    roles: ["ADMIN"],
  }), true);
  assert.equal(canReadProgramRunningAnalytics({
    ...access,
    userId: "admin-1",
    roles: ["ADMIN"],
    programStatus: "ARCHIVED",
  }), true);
});

test("no role or unsupported Program lifecycle is denied", () => {
  assert.equal(canReadProgramRunningAnalytics({ ...access, roles: [] }), false);
  assert.equal(canReadProgramRunningAnalytics({ ...access, programStatus: "DRAFT" }), false);
});
