import assert from "node:assert/strict";
import test from "node:test";

import {
  cancellationRequestStatusLabel,
  isAfterCancellationBoundary,
  pendingCancellationRequest,
  trainingProgramStatusLabel,
} from "./presentation";

test("cancellation presentation labels distinguish program and request lifecycle states", () => {
  assert.equal(trainingProgramStatusLabel("CANCELLED"), "Cancelled");
  assert.equal(trainingProgramStatusLabel("ARCHIVED"), "Archived");
  assert.equal(cancellationRequestStatusLabel("PENDING"), "Waiting for review");
  assert.equal(cancellationRequestStatusLabel("DECLINED"), "Declined");
});

test("pending cancellation request and cancellation actionability boundary remain explicit", () => {
  const requests = [
    { id: "declined", status: "DECLINED" },
    { id: "pending", status: "PENDING" },
  ] as never;
  assert.equal(pendingCancellationRequest(requests)?.id, "pending");
  assert.equal(isAfterCancellationBoundary("2026-09-24", "2026-09-24T08:00:00Z"), true);
  assert.equal(isAfterCancellationBoundary("2026-09-23", "2026-09-24T08:00:00Z"), false);
  assert.equal(isAfterCancellationBoundary("2026-09-24", null), false);
});
