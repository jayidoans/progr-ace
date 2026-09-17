import assert from "node:assert/strict";
import { test } from "node:test";

import {
  complianceCounts,
  currentWeekFromPrescriptionDates,
  daysUntilDate,
  prescriptionComplianceState,
  type EvaluationActivity,
  type EvaluationClaim,
  type EvaluationPrescription,
  type EvaluationProgram,
  weeklyDistanceSummary,
} from "./analytics";

function activity(id: string, distanceM: number): EvaluationActivity {
  return {
    id,
    distance_m: distanceM,
    duration_sec: 1800,
    rpe: 6,
    source: "STRAVA",
    sport_type: "RUNNING",
    started_at: "2026-09-17T06:00:00Z",
  };
}

function claim(
  id: string,
  status: "DRAFT" | "SUBMITTED",
  result: string | null,
  evidence: EvaluationActivity[] = [],
): EvaluationClaim {
  return {
    id,
    status,
    submitted_at: status === "SUBMITTED" ? "2026-09-17T08:00:00Z" : null,
    validation: result ? { result, evaluation_source: "AUTOMATIC" } : null,
    evidence: evidence.map((item) => ({ activity: item })),
  };
}

function prescription(
  id: string,
  date: string,
  claims: EvaluationClaim[] = [],
  targetDistanceM: number | null = 5000,
): EvaluationPrescription {
  return {
    id,
    scheduled_date: date,
    title: id,
    training_menu: "EASY",
    components: [{ id: `${id}-component`, sequence_order: 1, target_distance_m: targetDistanceM }],
    claims,
  };
}

function program(weeks: EvaluationProgram["weeks"]): EvaluationProgram {
  return {
    id: "program-1",
    name: "Program",
    status: "PUBLISHED",
    start_date: "2026-09-01",
    end_date: "2026-10-31",
    created_by: "coach-1",
    race_goal: {
      id: "goal-1",
      athlete_id: "athlete-1",
      status: "ACTIVE",
      athlete: { id: "athlete-1", full_name: "Athlete", email: null },
      race: { id: "race-1", name: "Race", event_date: "2026-12-06", distance_m: 42195 },
    },
    weeks,
  };
}

test("current week is selected from actual prescription calendar dates", () => {
  const data = program([
    { id: "week-1", week_number: 1, phase: "Base", start_date: "2026-09-01", end_date: "2026-09-07", prescriptions: [prescription("old", "2026-09-03")] },
    { id: "week-9", week_number: 9, phase: "Build", start_date: "2026-09-14", end_date: "2026-09-20", prescriptions: [prescription("current", "2026-09-17")] },
  ]);
  assert.equal(currentWeekFromPrescriptionDates(data, "2026-09-17")?.week_number, 9);
});

test("future, past unclaimed, and today's unclaimed states preserve M6 date semantics", () => {
  assert.equal(prescriptionComplianceState(prescription("future", "2026-09-18"), "2026-09-17"), "UPCOMING");
  assert.equal(prescriptionComplianceState(prescription("past", "2026-09-16"), "2026-09-17"), "MISSED");
  assert.equal(prescriptionComplianceState(prescription("today", "2026-09-17"), "2026-09-17"), "NOT_CLAIMED");
});

test("session distribution retains authoritative validation results", () => {
  const items = [
    prescription("verified", "2026-09-14", [claim("c1", "SUBMITTED", "VERIFIED")]),
    prescription("partial", "2026-09-15", [claim("c2", "SUBMITTED", "PARTIAL")]),
    prescription("review", "2026-09-16", [claim("c3", "SUBMITTED", "NEEDS_REVIEW")]),
    prescription("rejected", "2026-09-16", [claim("c4", "SUBMITTED", "REJECTED")]),
  ];
  const counts = complianceCounts(items, "2026-09-17");
  assert.deepEqual(
    [counts.VERIFIED, counts.PARTIAL, counts.NEEDS_REVIEW, counts.REJECTED],
    [1, 1, 1, 1],
  );
});

test("weekly actual distance uses submitted Claim evidence only and deduplicates Activities", () => {
  const claimed = activity("claimed", 5000);
  const unrelated = activity("unrelated-strava", 20000);
  const items = [
    prescription("submitted-a", "2026-09-14", [claim("c1", "SUBMITTED", "VERIFIED", [claimed])]),
    prescription("submitted-b", "2026-09-15", [claim("c2", "SUBMITTED", "VERIFIED", [claimed])]),
    prescription("draft", "2026-09-16", [claim("c3", "DRAFT", null, [unrelated])]),
    prescription("unclaimed", "2026-09-17"),
  ];
  assert.deepEqual(weeklyDistanceSummary(items), {
    prescribedDistanceM: 20000,
    claimedRunningDistanceM: 5000,
    measurablePrescriptionCount: 4,
  });
});

test("distance without a complete explicit target remains unmeasurable", () => {
  const item = prescription("duration", "2026-09-17", [], null);
  assert.deepEqual(weeklyDistanceSummary([item]), {
    prescribedDistanceM: null,
    claimedRunningDistanceM: 0,
    measurablePrescriptionCount: 0,
  });
});

test("race countdown is derived from UTC calendar dates", () => {
  assert.equal(daysUntilDate("2026-12-06", "2026-09-17"), 80);
  assert.equal(daysUntilDate("2026-09-17", "2026-09-17"), 0);
});
