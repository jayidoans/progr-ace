import assert from "node:assert/strict";
import test from "node:test";

import { summarizeCoachTrainingInsights } from "./coach-presentation";
import type { CoachTrainingInsightsSummary } from "./types";

function summary(
  athleteId: string,
  programId: string,
  needsReview = 0,
  missed = 0,
): CoachTrainingInsightsSummary {
  return {
    athlete: { id: athleteId, name: athleteId },
    program: { id: programId, name: programId, status: "PUBLISHED", athleteId, coachId: "coach-1" },
    currentWeek: {
      id: `${programId}-week`, weekNumber: 1, phase: null, startDate: "2026-10-05", endDate: "2026-10-11",
      plannedDistance: { value: 5_000, measuredItems: 1, eligibleItems: 1, completeness: "COMPLETE" },
      actualDistance: { value: null, measuredItems: 0, eligibleItems: 1, completeness: "UNAVAILABLE" },
      outcomes: { UPCOMING: 0, NOT_CLAIMED: 0, DRAFT: 0, SUBMITTED: 0, VERIFIED: 0, PARTIAL: 0, NEEDS_REVIEW: needsReview, REJECTED: 0, MISSED: missed },
      needsReviewCount: needsReview,
      missedCount: missed,
    },
    trend: [],
  };
}

test("coach overview counts bounded programs without claiming a global total", () => {
  assert.deepEqual(summarizeCoachTrainingInsights([
    summary("athlete-1", "program-1", 2),
    summary("athlete-1", "program-2", 0, 1),
    summary("athlete-2", "program-3", 0),
  ]), {
    programsShown: 3,
    athletesRepresented: 2,
    needsReview: 2,
    missed: 1,
    athletesRequiringFollowUp: 1,
  });
});

test("an empty authorized projection has no implied athlete or session totals", () => {
  assert.deepEqual(summarizeCoachTrainingInsights([]), {
    programsShown: 0,
    athletesRepresented: 0,
    needsReview: 0,
    missed: 0,
    athletesRequiringFollowUp: 0,
  });
});
