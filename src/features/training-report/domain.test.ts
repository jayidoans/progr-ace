import assert from "node:assert/strict";
import { test } from "node:test";

import { buildCoachProgramReport, type ReportProgram } from "./domain";

test("report keeps the full schedule while calculating fulfillment from published evidence", () => {
  const program = {
    id: "program-1",
    name: "Marathon plan",
    status: "PUBLISHED",
    start_date: "2026-01-05",
    end_date: "2026-01-18",
    tracking_start_date: null,
    cancelled_at: null,
    created_by: "coach-1",
    race_goal: {
      id: "goal-1",
      athlete_id: "athlete-1",
      target_finish_time_sec: 14400,
      status: "ACTIVE",
      completed_at: null,
      completed_by: null,
      athlete: { id: "athlete-1", full_name: "Athlete", email: "athlete@example.com" },
      race: { id: "race-1", name: "Marathon", event_date: "2026-01-18", distance_m: 42195 },
    },
    weeks: [
      {
        id: "week-1", week_number: 1, phase: "Build", planning_status: "PUBLISHED", start_date: "2026-01-05", end_date: "2026-01-11",
        review: { fulfillment_rating: 8, coach_comment: "Good consistency." },
        prescriptions: [{
          id: "prescription-1", scheduled_date: "2026-01-06", title: "Easy Run", training_menu: "EASY",
          components: [{ id: "component-1", target_distance_m: 10000, target_duration_sec: 3600, sequence_order: 1 }],
          claims: [{
            id: "claim-1", status: "SUBMITTED", submitted_at: "2026-01-06T01:00:00Z", validation: { result: "VERIFIED", evaluation_source: "COACH" },
            evidence: [{ activity: { id: "activity-1", distance_m: 8000, duration_sec: 3000, rpe: 5, source: "MANUAL", sport_type: "RUNNING", started_at: "2026-01-06T00:00:00Z" } }],
          }],
        }],
      },
      {
        id: "week-2", week_number: 2, phase: "Peak", planning_status: "DRAFT", start_date: "2026-01-12", end_date: "2026-01-18",
        review: null,
        prescriptions: [{ id: "prescription-2", scheduled_date: "2026-01-13", title: "Strength", training_menu: "STRENGTH", components: [], claims: [] }],
      },
    ],
  } as unknown as ReportProgram;

  const report = buildCoachProgramReport(program, "2026-01-12", new Map([["prescription-1", "SUBMITTED"]]));

  assert.equal(report.weeks.length, 2);
  assert.equal(report.weeks[0].fulfillmentPercent, 80);
  assert.equal(report.weeks[0].fulfillmentRating, 8);
  assert.equal(report.weeks[0].coachComment, "Good consistency.");
  assert.deepEqual(report.weeks[0].sessions[0].targetDistance, { value: 10000, measuredItems: 1, eligibleItems: 1, completeness: "COMPLETE" });
  assert.deepEqual(report.weeks[0].sessions[0].targetDuration, { value: 3600, measuredItems: 1, eligibleItems: 1, completeness: "COMPLETE" });
  assert.equal(report.weeks[1].planningStatus, "DRAFT");
  assert.equal(report.weeks[1].outcomes.DRAFT, 1);
  assert.equal(report.summary.averageWeeklyFulfillmentPercent, 80);
  assert.deepEqual(report.summary.totalClaimedRunningDistance, { value: 8000, measuredItems: 1, eligibleItems: 1, completeness: "COMPLETE" });
});

function reportProgramWithComponents(components: Array<Record<string, unknown>>, activities: Array<Record<string, unknown>> = []) {
  return {
    id: "program-coverage",
    name: "Coverage plan",
    status: "PUBLISHED",
    start_date: "2026-01-05",
    end_date: "2026-01-11",
    tracking_start_date: null,
    cancelled_at: null,
    created_by: "coach-1",
    race_goal: {
      id: "goal-coverage", athlete_id: "athlete-1", target_finish_time_sec: 14400,
      athlete: { id: "athlete-1", full_name: "Athlete", email: "athlete@example.test" },
      race: { id: "race-1", name: "Race", event_date: "2026-01-11", distance_m: 42195 },
    },
    weeks: [{
      id: "week-coverage", week_number: 1, phase: "Build", planning_status: "PUBLISHED", start_date: "2026-01-05", end_date: "2026-01-11", review: null,
      prescriptions: [{
        id: "session-1", scheduled_date: "2026-01-06", title: "Quality run", training_menu: "SPEED", components,
        claims: activities.length === 0 ? [] : [{
          id: "claim-1", status: "SUBMITTED", submitted_at: "2026-01-06T01:00:00Z", validation: { result: "PARTIAL", evaluation_source: "COACH" },
          evidence: activities.map((activity) => ({ activity })),
        }],
      }],
    }],
  } as unknown as ReportProgram;
}

test("report uses canonical component precedence, partial coverage, and supported duration fields", () => {
  const report = buildCoachProgramReport(reportProgramWithComponents([
    { id: "direct", sequence_order: 1, target_distance_m: 5000, target_duration_sec: 1500, repetitions: 4, distance_per_rep_m: 400 },
    { id: "interval", sequence_order: 2, target_distance_m: null, target_duration_sec: null, repetitions: 3, distance_per_rep_m: 800 },
    { id: "unknown", sequence_order: 3, target_distance_m: null, target_duration_sec: null, repetitions: null, distance_per_rep_m: null },
  ], [{ id: "activity-1", sport_type: "RUNNING", distance_m: 7000, duration_sec: 2400 }]), "2026-01-12");

  // Direct target distance wins for the first component; it is not added to 4 × 400.
  assert.deepEqual(report.weeks[0].prescribedRunningDistance, { value: 7400, measuredItems: 2, eligibleItems: 3, completeness: "PARTIAL" });
  assert.deepEqual(report.weeks[0].prescribedRunningDuration, { value: 1500, measuredItems: 1, eligibleItems: 3, completeness: "PARTIAL" });
  assert.equal(report.weeks[0].fulfillmentPercent, null);
  assert.deepEqual(report.weeks[0].sessions[0].targetDistance, { value: 7400, measuredItems: 2, eligibleItems: 3, completeness: "PARTIAL" });
});

test("report distinguishes missing values from explicit zero and deduplicates activities", () => {
  const missing = buildCoachProgramReport(reportProgramWithComponents([
    { id: "unknown", sequence_order: 1, target_distance_m: null, target_duration_sec: null, repetitions: null, distance_per_rep_m: null },
  ], [{ id: "missing-activity", sport_type: "RUNNING", distance_m: null, duration_sec: null }]), "2026-01-12");
  assert.deepEqual(missing.weeks[0].actualClaimedRunningDistance, { value: null, measuredItems: 0, eligibleItems: 1, completeness: "UNAVAILABLE" });

  const withZero = buildCoachProgramReport(reportProgramWithComponents([
    { id: "zero", sequence_order: 1, target_distance_m: 0, target_duration_sec: 0, repetitions: null, distance_per_rep_m: null },
  ], [
    { id: "zero-activity", sport_type: "RUNNING", distance_m: 0, duration_sec: 0 },
    { id: "zero-activity", sport_type: "RUNNING", distance_m: 0, duration_sec: 0 },
  ]), "2026-01-12");
  assert.deepEqual(withZero.weeks[0].actualClaimedRunningDistance, { value: 0, measuredItems: 1, eligibleItems: 1, completeness: "COMPLETE" });
  assert.equal(withZero.weeks[0].fulfillmentPercent, null);
  assert.deepEqual(withZero.summary.totalClaimedRunningDuration, { value: 0, measuredItems: 1, eligibleItems: 1, completeness: "COMPLETE" });
});

test("report retains M10 outcomes and cancellation boundaries independently from metric coverage", () => {
  const program = reportProgramWithComponents([
    { id: "distance", sequence_order: 1, target_distance_m: 5000, target_duration_sec: null, repetitions: null, distance_per_rep_m: null },
  ]);
  program.tracking_start_date = "2026-01-06";
  program.cancelled_at = "2026-01-07T00:00:00Z";
  const prescription = program.weeks[0].prescriptions[0];
  prescription.claims = [{
    id: "claim-needs-review", status: "SUBMITTED", submitted_at: "2026-01-06T01:00:00Z",
    validation: { result: "NEEDS_REVIEW", evaluation_source: "COACH" }, evidence: [],
  }];
  const report = buildCoachProgramReport(program, "2026-01-12", new Map([["session-1", "SUBMITTED"]]));
  assert.equal(report.weeks[0].outcomes.NEEDS_REVIEW, 1);
  assert.deepEqual(report.weeks[0].actualClaimedRunningDistance, { value: null, measuredItems: 0, eligibleItems: 0, completeness: "UNAVAILABLE" });
});
