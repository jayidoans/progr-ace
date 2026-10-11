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
          components: [{ id: "component-1", target_distance_m: 10000, sequence_order: 1 }],
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
  assert.equal(report.weeks[1].planningStatus, "DRAFT");
  assert.equal(report.weeks[1].outcomes.DRAFT, 1);
  assert.equal(report.summary.averageWeeklyFulfillmentPercent, 80);
  assert.equal(report.summary.totalClaimedRunningDistanceM, 8000);
});
