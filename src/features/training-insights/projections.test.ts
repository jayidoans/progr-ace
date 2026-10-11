import assert from "node:assert/strict";
import test from "node:test";

import {
  canReadCoachTrainingInsights,
  canReadTrainingInsightsProgram,
} from "./authorization";
import {
  fourWeekWindowStart,
  projectCoachTrainingInsights,
  projectProgramTrainingInsights,
  type TrainingInsightsProgram,
} from "./projections";

function program(overrides: Partial<TrainingInsightsProgram> = {}): TrainingInsightsProgram {
  return {
    id: "program-1",
    name: "Marathon Build",
    status: "PUBLISHED",
    start_date: "2026-09-01",
    end_date: "2026-12-01",
    tracking_start_date: "2026-09-01",
    cancelled_at: null,
    created_by: "coach-1",
    race_goal: {
      id: "goal-1",
      athlete_id: "athlete-1",
      status: "ACTIVE",
      target_finish_time_sec: 14400,
      completed_at: null,
      completed_by: null,
      athlete: { id: "athlete-1", full_name: "Athlete One", email: "athlete@example.test" },
      race: { id: "race-1", name: "Marathon", event_date: "2026-12-01", distance_m: 42_195 },
    },
    weeks: [],
    ...overrides,
  };
}

function week(
  number: number,
  startDate: string,
  prescriptions: TrainingInsightsProgram["weeks"][number]["prescriptions"] = [],
) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(start.valueOf() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    id: `week-${number}`,
    week_number: number,
    phase: "BUILD",
    planning_status: "PUBLISHED",
    start_date: startDate,
    end_date: end,
    prescriptions,
  } as TrainingInsightsProgram["weeks"][number];
}

function prescription(
  id: string,
  date: string,
  options: {
    status?: string;
    distance?: number | null;
    activityDistance?: number | null;
    validationResult?: string | null;
  } = {},
) {
  const status = options.status ?? null;
  return {
    id,
    scheduled_date: date,
    title: "Easy Run",
    training_menu: "EASY",
    components: [{
      id: `${id}-component`,
      sequence_order: 1,
      target_distance_m: "distance" in options ? options.distance ?? null : 5_000,
      target_duration_sec: null,
      repetitions: null,
      distance_per_rep_m: null,
    }],
    claims: status ? [{
      id: `${id}-claim`,
      status,
      submitted_at: status === "SUBMITTED" ? "2026-10-09T01:00:00Z" : null,
      validation: options.validationResult ? { result: options.validationResult, evaluation_source: "MANUAL" } : null,
      evidence: [{
        activity: {
          id: `${id}-activity`, distance_m: "activityDistance" in options ? options.activityDistance ?? null : 4_000, duration_sec: 1_500,
          rpe: null, source: "MANUAL", sport_type: "RUNNING", started_at: "2026-10-09T01:00:00Z",
        },
      }],
    }] : [],
  } as unknown as TrainingInsightsProgram["weeks"][number]["prescriptions"][number];
}

test("uses UTC calendar weeks and returns at most four published weeks", () => {
  assert.equal(fourWeekWindowStart("2026-10-10"), "2026-09-14");
  const insights = projectProgramTrainingInsights(program({
    weeks: [
      week(1, "2026-09-07"),
      week(2, "2026-09-14"),
      week(3, "2026-09-21"),
      week(4, "2026-09-28"),
      week(5, "2026-10-05", [prescription("current", "2026-10-09", { status: "SUBMITTED" })]),
      { ...week(6, "2026-10-12"), planning_status: "DRAFT" },
    ],
  }), "2026-10-10");
  assert.deepEqual(insights.fourWeekTrend.map((item) => item.weekNumber), [2, 3, 4, 5]);
  assert.equal(insights.currentWeek?.weekNumber, 5);
  assert.equal(insights.timezone, "UTC");
});

test("uses canonical distance coverage and does not turn missing activity distance into zero", () => {
  const insights = projectProgramTrainingInsights(program({
    weeks: [week(5, "2026-10-05", [
      prescription("known", "2026-10-09", { status: "SUBMITTED", distance: 5_000, activityDistance: 4_000 }),
      prescription("unknown", "2026-10-10", { status: "SUBMITTED", distance: null, activityDistance: null }),
    ])],
  }), "2026-10-10");
  assert.deepEqual(insights.currentWeek?.plannedDistance, {
    value: 5_000, measuredItems: 1, eligibleItems: 2, completeness: "PARTIAL",
  });
  assert.deepEqual(insights.currentWeek?.actualDistance, {
    value: 4_000, measuredItems: 1, eligibleItems: 2, completeness: "PARTIAL",
  });
});

test("retains M10 outcome semantics for tracking start, missing claims, and cancellation", () => {
  const insights = projectProgramTrainingInsights(program({
    tracking_start_date: "2026-10-09",
    cancelled_at: "2026-10-10T06:00:00Z",
    weeks: [week(5, "2026-10-05", [
      prescription("before-tracking", "2026-10-06"),
      prescription("needs-review", "2026-10-09", { status: "SUBMITTED", validationResult: "NEEDS_REVIEW" }),
      prescription("after-cancellation", "2026-10-10"),
    ])],
  }), "2026-10-11");
  assert.equal(insights.currentWeek?.outcomes.NOT_CLAIMED, 1);
  assert.equal(insights.currentWeek?.needsReviewCount, 1);
  assert.equal(insights.currentWeek?.missedCount, 0);
});

test("coach summary stays compact and only derives data from the bounded projection", () => {
  const summary = projectCoachTrainingInsights([
    program({ id: "program-2", race_goal: { ...program().race_goal, athlete_id: "athlete-2", athlete: { id: "athlete-2", full_name: "Athlete Two", email: "two@example.test" } }, weeks: [week(5, "2026-10-05", [prescription("missed", "2026-10-06")]) ] }),
    program({ id: "program-1", weeks: [week(5, "2026-10-05", [prescription("review", "2026-10-09", { status: "SUBMITTED", validationResult: "NEEDS_REVIEW" })]) ] }),
  ], "2026-10-11");
  assert.equal(summary.length, 2);
  assert.equal(summary[0].athlete.id, "athlete-1");
  assert.equal(summary[0].trend.length, 1);
});

test("empty authorized program sets produce an empty coach projection", () => {
  assert.deepEqual(projectCoachTrainingInsights([], "2026-10-11"), []);
});

test("authorization is role and ownership based, never Active Mode based", () => {
  const ownAthlete = { userId: "athlete-1", roles: ["ATHLETE"], programStatus: "PUBLISHED", programCreatedBy: "coach-1", athleteId: "athlete-1" };
  assert.equal(canReadTrainingInsightsProgram(ownAthlete), true);
  assert.equal(canReadTrainingInsightsProgram({ ...ownAthlete, userId: "athlete-2" }), false);
  assert.equal(canReadTrainingInsightsProgram({ ...ownAthlete, userId: "coach-1", roles: ["COACH"] }), true);
  assert.equal(canReadTrainingInsightsProgram({ ...ownAthlete, userId: "coach-2", roles: ["COACH"] }), false);
  assert.equal(canReadTrainingInsightsProgram({ ...ownAthlete, userId: "admin-1", roles: ["ADMIN"] }), true);
  assert.equal(canReadTrainingInsightsProgram({ ...ownAthlete, programStatus: "DRAFT" }), false);
  assert.equal(canReadCoachTrainingInsights(["ATHLETE"]), false);
  assert.equal(canReadCoachTrainingInsights(["COACH", "ATHLETE"]), true);
});
