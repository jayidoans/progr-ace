import assert from "node:assert/strict";
import test from "node:test";

import {
  directCancellationSchema,
  requestCancellationSchema,
  reviewCancellationSchema,
} from "./schemas";

const programId = "11111111-1111-4111-8111-111111111111";

test("cancellation reasons are required, trimmed, and bounded", () => {
  assert.equal(requestCancellationSchema.parse({ programId, reason: "  Stop training  " }).reason, "Stop training");
  assert.equal(requestCancellationSchema.safeParse({ programId, reason: "   " }).success, false);
  assert.equal(directCancellationSchema.safeParse({ programId, reason: "x".repeat(1001) }).success, false);
});

test("review accepts only the locked request decisions", () => {
  assert.equal(reviewCancellationSchema.safeParse({
    requestId: programId,
    decision: "APPROVED",
    reviewReason: "Reviewed",
  }).success, true);
  assert.equal(reviewCancellationSchema.safeParse({
    requestId: programId,
    decision: "CANCELLED",
  }).success, false);
});
