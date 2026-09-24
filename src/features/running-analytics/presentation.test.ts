import assert from "node:assert/strict";
import test from "node:test";

import { filterRunningSessions, formatPaceSecondsPerKm, summarizeRunningAnalytics } from "@/src/features/running-analytics/presentation";
import type { ProgramRunningAnalytics } from "@/src/features/running-analytics/domain";

const base: ProgramRunningAnalytics = {
  context: { programId: "p", programName: "Plan", programStatus: "PUBLISHED", programStartDate: "2026-01-01", programEndDate: "2026-03-01", programCancelledAt: null, athleteId: "a", athleteName: "Athlete", athleteEmail: null, raceGoalId: "g", raceGoalStatus: "ACTIVE", raceName: "Race", raceDate: "2026-03-01", currentWeekNumber: 2 },
  weeks: [
    { weekId: "w1", weekNumber: 1, startDate: "2026-01-01", endDate: "2026-01-07", phase: null, isCurrentWeek: false, prescribedRunningDistanceM: 10000, actualClaimedRunningDistanceM: 9000, durationOnlyRunningPrescriptionCount: 1, durationOnlyRunningComponentCount: 1, runningActivityCount: 1, outcomes: { DRAFT: 0, SUBMITTED: 0, VERIFIED: 1, PARTIAL: 0, NEEDS_REVIEW: 0, REJECTED: 0, MISSED: 0, NOT_CLAIMED: 0, UPCOMING: 0 } },
    { weekId: "w2", weekNumber: 2, startDate: "2026-01-08", endDate: "2026-01-14", phase: "Build", isCurrentWeek: true, prescribedRunningDistanceM: null, actualClaimedRunningDistanceM: null, durationOnlyRunningPrescriptionCount: 0, durationOnlyRunningComponentCount: 0, runningActivityCount: 0, outcomes: { DRAFT: 0, SUBMITTED: 0, VERIFIED: 0, PARTIAL: 0, NEEDS_REVIEW: 0, REJECTED: 0, MISSED: 1, NOT_CLAIMED: 0, UPCOMING: 0 } },
  ],
  sessions: [
    { prescriptionId: "s1", weekId: "w1", weekNumber: 1, phase: null, scheduledDate: "2026-01-02", trainingMenu: "EASY", title: "Easy", description: null, prescribedComponents: [], prescribedDistanceM: 10000, prescribedDurationSec: null, outcome: "VERIFIED", validationResult: "VERIFIED", claimId: "c", actualRunningDistanceM: 9000, actualRunningDurationSec: 3000, wholeSessionPaceSecPerKm: 333.3, singleActivityAverageHrBpm: null, singleActivityRpe: null, runningActivities: [] },
  ],
};

test("presentation preserves missing values and filters menu", () => {
  assert.equal(formatPaceSecondsPerKm(null), "—");
  assert.equal(formatPaceSecondsPerKm(333), "5:33 /km");
  assert.equal(filterRunningSessions(base.sessions, "EASY").length, 1);
  assert.equal(filterRunningSessions(base.sessions, "LONG").length, 0);
});

test("summary aggregates factual known values without turning missing data into zero", () => {
  assert.deepEqual(summarizeRunningAnalytics(base), { plannedDistanceM: 10000, completedDistanceM: 9000, publishedSessions: 2, missedSessions: 1 });
});
