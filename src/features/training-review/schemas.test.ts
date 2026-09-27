import assert from "node:assert/strict";
import test from "node:test";

import { activityCommentSchema, weekReviewSchema } from "./schemas";

test("activity comments require meaningful bounded text", () => {
  const base = { claimActivityId: crypto.randomUUID(), programId: crypto.randomUUID() };
  assert.equal(activityCommentSchema.safeParse({ ...base, coachComment: "  Good pacing  " }).success, true);
  assert.equal(activityCommentSchema.safeParse({ ...base, coachComment: "   " }).success, false);
  assert.equal(activityCommentSchema.safeParse({ ...base, coachComment: "x".repeat(4001) }).success, false);
});

test("week review accepts only a 0-10 integer rating and optional comment", () => {
  const base = { programId: crypto.randomUUID(), trainingWeekId: crypto.randomUUID() };
  assert.equal(weekReviewSchema.safeParse({ ...base, fulfillmentRating: "0", coachComment: "" }).success, true);
  assert.equal(weekReviewSchema.safeParse({ ...base, fulfillmentRating: "10", coachComment: "Solid week" }).success, true);
  assert.equal(weekReviewSchema.safeParse({ ...base, fulfillmentRating: "11", coachComment: "" }).success, false);
  assert.equal(weekReviewSchema.safeParse({ ...base, fulfillmentRating: "5.5", coachComment: "" }).success, false);
});
