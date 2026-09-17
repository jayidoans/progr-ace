import assert from "node:assert/strict";
import { test } from "node:test";

import {
  currentTrainingWeek,
  distanceCompletionPercent,
  summarizeStravaActivities,
  sumTargetDistanceM,
} from "./weekly-stats";

test("current training week uses deterministic Monday-through-Sunday UTC boundaries", () => {
  assert.deepEqual(currentTrainingWeek(new Date("2026-09-17T23:30:00Z")), {
    startAt: "2026-09-14T00:00:00.000Z",
    endAt: "2026-09-21T00:00:00.000Z",
    startDate: "2026-09-14",
    endDate: "2026-09-20",
  });
});

test("weekly targets use direct distance or repetition distance without double counting", () => {
  assert.equal(
    sumTargetDistanceM([
      { target_distance_m: 5_000, repetitions: null, distance_per_rep_m: null },
      { target_distance_m: null, repetitions: 8, distance_per_rep_m: 400 },
      { target_distance_m: 2_000, repetitions: 4, distance_per_rep_m: 200 },
      { target_distance_m: null, repetitions: null, distance_per_rep_m: null },
    ]),
    10_200,
  );
  assert.equal(
    sumTargetDistanceM([
      { target_distance_m: null, repetitions: null, distance_per_rep_m: null },
    ]),
    null,
  );
});

test("Strava totals count all activities but only running distance toward weekly mileage", () => {
  assert.deepEqual(
    summarizeStravaActivities([
      { sport_type: "RUNNING", distance_m: 5_100 },
      { sport_type: "RUNNING", distance_m: null },
      { sport_type: "CYCLING", distance_m: 20_000 },
    ]),
    { totalActivities: 3, runningDistanceM: 5_100 },
  );
});

test("completion is unavailable without a target and may exceed 100 percent", () => {
  assert.equal(distanceCompletionPercent(5_000, null), null);
  assert.equal(distanceCompletionPercent(7_500, 10_000), 75);
  assert.equal(distanceCompletionPercent(12_500, 10_000), 125);
});
