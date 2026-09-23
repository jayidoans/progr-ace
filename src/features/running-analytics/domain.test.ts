import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProgramRunningAnalytics,
  type RunningAnalyticsActivity,
  type RunningAnalyticsClaim,
  type RunningAnalyticsComponent,
  type RunningAnalyticsPrescription,
  type RunningAnalyticsProgramSource,
  type RunningAnalyticsWeekSource,
} from "./domain";

function component(
  id: string,
  overrides: Partial<RunningAnalyticsComponent> = {},
): RunningAnalyticsComponent {
  return {
    id,
    component_type: "STEADY",
    sequence_order: 1,
    target_distance_m: null,
    target_duration_sec: null,
    repetitions: null,
    distance_per_rep_m: null,
    recovery_duration_sec: null,
    target_pace_min_sec_per_km: null,
    target_pace_max_sec_per_km: null,
    instruction: null,
    ...overrides,
  };
}

function activity(
  id: string,
  overrides: Partial<RunningAnalyticsActivity> = {},
): RunningAnalyticsActivity {
  return {
    id,
    name: id,
    source: "STRAVA",
    sport_type: "RUNNING",
    started_at: "2026-09-14T06:00:00Z",
    distance_m: 5_000,
    duration_sec: 1_500,
    average_hr_bpm: 150,
    rpe: 6,
    ...overrides,
  };
}

function claim(
  id: string,
  status: "DRAFT" | "SUBMITTED",
  activities: RunningAnalyticsActivity[] = [],
  result: string | null = null,
): RunningAnalyticsClaim {
  return {
    id,
    status,
    submitted_at: status === "SUBMITTED" ? "2026-09-14T08:00:00Z" : null,
    validation: result ? { result, evaluation_source: "AUTOMATIC" } : null,
    evidence: activities.map((item) => ({ activity: item })),
  };
}

function prescription(
  id: string,
  date: string,
  options: {
    menu?: string;
    components?: RunningAnalyticsComponent[];
    claims?: RunningAnalyticsClaim[];
  } = {},
): RunningAnalyticsPrescription {
  return {
    id,
    scheduled_date: date,
    training_menu: options.menu ?? "EASY",
    title: id,
    description: null,
    components: options.components ?? [component(`${id}-component`, { target_distance_m: 5_000 })],
    claims: options.claims ?? [],
  };
}

function week(
  id: string,
  number: number,
  status: string,
  prescriptions: RunningAnalyticsPrescription[],
  startDate = "2026-09-14",
  endDate = "2026-09-20",
): RunningAnalyticsWeekSource {
  return {
    id,
    week_number: number,
    phase: "Build",
    planning_status: status,
    start_date: startDate,
    end_date: endDate,
    prescriptions,
  };
}

function program(weeks: RunningAnalyticsWeekSource[], goalStatus = "ACTIVE"): RunningAnalyticsProgramSource {
  return {
    id: "program-1",
    name: "Marathon Plan",
    status: "PUBLISHED",
    start_date: "2026-09-01",
    end_date: "2026-12-06",
    created_by: "coach-1",
    race_goal: {
      id: "goal-1",
      athlete_id: "athlete-1",
      status: goalStatus,
      athlete: { id: "athlete-1", full_name: "Runner", email: "runner@example.test" },
      race: { id: "race-1", name: "Marathon", event_date: "2026-12-06" },
    },
    weeks,
  };
}

test("only published program-to-date weeks contribute", () => {
  const result = buildProgramRunningAnalytics(program([
    week("published", 1, "PUBLISHED", [prescription("published-session", "2026-09-15")]),
    week("draft", 2, "DRAFT", [prescription("draft-session", "2026-09-22")], "2026-09-21", "2026-09-27"),
    week("future", 3, "PUBLISHED", [prescription("future-session", "2026-10-01")], "2026-09-28", "2026-10-04"),
  ]), "2026-09-17");

  assert.deepEqual(result.weeks.map((item) => item.weekId), ["published"]);
  assert.deepEqual(result.sessions.map((item) => item.prescriptionId), ["published-session"]);
  assert.equal(result.context.currentWeekNumber, 1);
});

test("prescribed volume uses explicit distance and repetition distance without estimating duration", () => {
  const session = prescription("mixed-targets", "2026-09-15", {
    components: [
      component("distance", { target_distance_m: 5_000 }),
      component("interval", { sequence_order: 2, repetitions: 4, distance_per_rep_m: 800 }),
      component("duration", { sequence_order: 3, target_duration_sec: 2_700 }),
    ],
  });
  const result = buildProgramRunningAnalytics(program([week("week", 1, "PUBLISHED", [session])]), "2026-09-17");

  assert.equal(result.weeks[0].prescribedRunningDistanceM, 8_200);
  assert.equal(result.weeks[0].durationOnlyRunningPrescriptionCount, 0);
  assert.equal(result.weeks[0].durationOnlyRunningComponentCount, 1);
  assert.equal(result.sessions[0].prescribedDistanceM, 8_200);
  assert.equal(result.sessions[0].prescribedDurationSec, 2_700);
});

test("a duration-only running session remains distance-null and is counted transparently", () => {
  const durationOnly = prescription("duration", "2026-09-15", {
    components: [component("duration-component", { target_duration_sec: 2_700 })],
  });
  const result = buildProgramRunningAnalytics(program([week("week", 1, "PUBLISHED", [durationOnly])]), "2026-09-17");

  assert.equal(result.weeks[0].prescribedRunningDistanceM, null);
  assert.equal(result.weeks[0].durationOnlyRunningPrescriptionCount, 1);
  assert.equal(result.weeks[0].durationOnlyRunningComponentCount, 1);
});

test("running mileage uses only unique RUNNING evidence from submitted Claims", () => {
  const counted = activity("counted", { distance_m: 10_000 });
  const evidence = [
    counted,
    activity("strength", { sport_type: "STRENGTH_TRAINING", distance_m: 2_000 }),
    activity("walk", { sport_type: "WALKING", distance_m: 3_000 }),
    activity("cycle", { sport_type: "CYCLING", distance_m: 40_000 }),
    activity("padel", { sport_type: "PADEL", distance_m: 1_000 }),
    activity("other", { sport_type: "OTHER", distance_m: 500 }),
  ];
  const result = buildProgramRunningAnalytics(program([week("week", 1, "PUBLISHED", [
    prescription("submitted", "2026-09-14", { claims: [claim("submitted-claim", "SUBMITTED", evidence, "VERIFIED")] }),
    prescription("draft", "2026-09-15", { claims: [claim("draft-claim", "DRAFT", [activity("draft-run", { distance_m: 20_000 })])] }),
    prescription("unclaimed", "2026-09-16"),
  ])]), "2026-09-17");

  assert.equal(result.weeks[0].actualClaimedRunningDistanceM, 10_000);
  assert.equal(result.weeks[0].runningActivityCount, 1);
  assert.equal(result.sessions.find((item) => item.prescriptionId === "draft")?.actualRunningDistanceM, null);
});

test("multi-Activity totals deduplicate joins and pace uses total duration divided by total distance", () => {
  const first = activity("first", { distance_m: 12_000, duration_sec: 4_500, average_hr_bpm: 145, rpe: 5 });
  const second = activity("second", { distance_m: 8_000, duration_sec: 3_120, average_hr_bpm: 160, rpe: 8 });
  const result = buildProgramRunningAnalytics(program([week("week", 1, "PUBLISHED", [
    prescription("long", "2026-09-14", { menu: "LONG", claims: [claim("claim", "SUBMITTED", [first, first, second], "VERIFIED")] }),
  ])]), "2026-09-17");
  const session = result.sessions[0];

  assert.equal(session.actualRunningDistanceM, 20_000);
  assert.equal(session.actualRunningDurationSec, 7_620);
  assert.equal(session.wholeSessionPaceSecPerKm, 381);
  assert.equal(result.weeks[0].actualClaimedRunningDistanceM, 20_000);
  assert.equal(result.weeks[0].runningActivityCount, 2);
});

test("invalid or incomplete pace inputs remain null", () => {
  const result = buildProgramRunningAnalytics(program([week("week", 1, "PUBLISHED", [
    prescription("zero", "2026-09-14", { claims: [claim("c1", "SUBMITTED", [activity("zero-run", { distance_m: 0 })])] }),
    prescription("missing", "2026-09-15", { claims: [claim("c2", "SUBMITTED", [activity("missing-run", { duration_sec: null })])] }),
  ])]), "2026-09-17");

  assert.equal(result.sessions[0].wholeSessionPaceSecPerKm, null);
  assert.equal(result.sessions[1].wholeSessionPaceSecPerKm, null);
});

test("HR and RPE remain Activity-level for multi-Activity sessions", () => {
  const result = buildProgramRunningAnalytics(program([week("week", 1, "PUBLISHED", [
    prescription("single", "2026-09-14", { claims: [claim("single-claim", "SUBMITTED", [activity("one", { average_hr_bpm: 151, rpe: 7 })])] }),
    prescription("multi", "2026-09-15", { claims: [claim("multi-claim", "SUBMITTED", [
      activity("two-a", { average_hr_bpm: 140, rpe: 5 }),
      activity("two-b", { average_hr_bpm: 170, rpe: 9 }),
    ])] }),
  ])]), "2026-09-17");
  const single = result.sessions.find((item) => item.prescriptionId === "single")!;
  const multi = result.sessions.find((item) => item.prescriptionId === "multi")!;

  assert.equal(single.singleActivityAverageHrBpm, 151);
  assert.equal(single.singleActivityRpe, 7);
  assert.equal(multi.singleActivityAverageHrBpm, null);
  assert.equal(multi.singleActivityRpe, null);
  assert.deepEqual(multi.runningActivities.map((item) => item.average_hr_bpm), [140, 170]);
  assert.deepEqual(multi.runningActivities.map((item) => item.rpe), [5, 9]);
});

test("weekly outcomes reuse Validation and existing MISSED/current/future semantics", () => {
  const source = program([week("week", 1, "PUBLISHED", [
    prescription("verified", "2026-09-14", { claims: [claim("verified-claim", "SUBMITTED", [activity("verified-run")], "VERIFIED")] }),
    prescription("partial", "2026-09-14", { claims: [claim("partial-claim", "SUBMITTED", [activity("partial-run")], "PARTIAL")] }),
    prescription("review", "2026-09-14", { claims: [claim("review-claim", "SUBMITTED", [activity("review-run")], "NEEDS_REVIEW")] }),
    prescription("rejected", "2026-09-14", { claims: [claim("rejected-claim", "SUBMITTED", [activity("rejected-run")], "REJECTED")] }),
    prescription("missed", "2026-09-16"),
    prescription("hidden-draft", "2026-09-16"),
    prescription("today", "2026-09-17"),
    prescription("upcoming", "2026-09-18"),
  ])]);
  const result = buildProgramRunningAnalytics(
    source,
    "2026-09-17",
    new Map([["hidden-draft", "DRAFT"]]),
  );
  const counts = result.weeks[0].outcomes;

  assert.deepEqual(
    [counts.VERIFIED, counts.PARTIAL, counts.NEEDS_REVIEW, counts.REJECTED, counts.DRAFT, counts.MISSED, counts.NOT_CLAIMED, counts.UPCOMING],
    [1, 1, 1, 1, 1, 1, 1, 1],
  );
});

test("historical pre-adoption sessions are not reported as missed", () => {
  const source = { ...program([week("week", 1, "PUBLISHED", [prescription("historical", "2026-09-16")])]), tracking_start_date: "2026-09-17" };
  const result = buildProgramRunningAnalytics(source, "2026-09-17");
  assert.equal(result.weeks[0].outcomes.MISSED, 0);
  assert.equal(result.weeks[0].outcomes.NOT_CLAIMED, 1);
});

test("SPEED data remains whole-session observation and completed Race Goals retain analytics", () => {
  const speed = prescription("intervals", "2026-09-14", {
    menu: "SPEED",
    components: [component("interval", { repetitions: 6, distance_per_rep_m: 800 })],
    claims: [claim("speed-claim", "SUBMITTED", [activity("speed-run", { distance_m: 10_200, duration_sec: 3_386 })], "NEEDS_REVIEW")],
  });
  const result = buildProgramRunningAnalytics(program([week("week", 1, "PUBLISHED", [speed])], "COMPLETED"), "2026-09-17");

  assert.equal(result.context.raceGoalStatus, "COMPLETED");
  assert.equal(result.sessions[0].trainingMenu, "SPEED");
  assert.equal(result.sessions[0].actualRunningDistanceM, 10_200);
  assert.equal(result.sessions[0].validationResult, "NEEDS_REVIEW");
  assert.equal(result.sessions[0].wholeSessionPaceSecPerKm, 3_386 / 10.2);
});
