import assert from "node:assert/strict";
import { test } from "node:test";

import {
  activitySyncAfterEpochSeconds,
  normalizeStravaActivity,
  normalizeStravaSportType,
  stravaSummaryActivitiesSchema,
} from "../activity-sync";

const baseActivity = {
  id: 123456789,
  name: "  Morning run  ",
  sport_type: "Run",
  type: "Run",
  start_date: "2026-09-17T00:30:00Z",
  start_date_local: "2026-09-17T07:30:00+07:00",
  distance: 7390.49,
  moving_time: 3402,
  elapsed_time: 3601,
  total_elevation_gain: 123.6,
  average_heartrate: 149.6,
  max_heartrate: 171.4,
  trainer: false,
  commute: true,
  private: true,
  visibility: "only_me",
  map: { summary_polyline: "must-not-persist" },
  start_latlng: [-6.2, 106.8],
  laps: [{ id: 1 }],
  segment_efforts: [{ id: 2 }],
};

test("explicit and ambiguous Strava sports normalize conservatively", () => {
  for (const sport of ["Run", "TrailRun", "VirtualRun"]) {
    assert.equal(normalizeStravaSportType(sport), "RUNNING");
  }
  for (const sport of ["Walk", "Hike"]) {
    assert.equal(normalizeStravaSportType(sport), "WALKING");
  }
  for (const sport of ["Ride", "MountainBikeRide", "GravelRide", "VirtualRide", "EBikeRide", "EMountainBikeRide", "Velomobile"]) {
    assert.equal(normalizeStravaSportType(sport), "CYCLING");
  }
  assert.equal(normalizeStravaSportType("WeightTraining"), "STRENGTH_TRAINING");
  assert.equal(normalizeStravaSportType("Padel"), "PADEL");
  for (const sport of ["Workout", "Crossfit", "HighIntensityIntervalTraining", "FutureSport"]) {
    assert.equal(normalizeStravaSportType(sport), "OTHER");
  }
});

test("normalization uses canonical units, UTC start_date, and an allow-listed raw snapshot", () => {
  const parsed = stravaSummaryActivitiesSchema.parse([baseActivity])[0];
  const normalized = normalizeStravaActivity(parsed);
  assert.deepEqual(normalized, {
    external_activity_id: "123456789",
    name: "Morning run",
    sport_type: "RUNNING",
    started_at: "2026-09-17T00:30:00.000Z",
    distance_m: 7390,
    duration_sec: 3402,
    average_hr_bpm: 150,
    max_hr_bpm: 171,
    elevation_gain_m: 124,
    raw_data: {
      sport_type: "Run",
      type: "Run",
      elapsed_time: 3601,
      moving_time: 3402,
      trainer: false,
      commute: true,
      private: true,
      visibility: "only_me",
    },
  });
  const keys = Object.keys(normalized.raw_data as Record<string, unknown>);
  for (const forbidden of ["map", "summary_polyline", "start_latlng", "laps", "segment_efforts"]) {
    assert.equal(keys.includes(forbidden), false);
  }
});

test("optional metrics remain null and malformed responses are rejected", () => {
  const activity = stravaSummaryActivitiesSchema.parse([{
    id: 2,
    name: "Yoga",
    sport_type: "Yoga",
    start_date: "2026-09-17T01:00:00Z",
    moving_time: 1200,
  }])[0];
  const normalized = normalizeStravaActivity(activity);
  assert.equal(normalized.distance_m, null);
  assert.equal(normalized.average_hr_bpm, null);
  assert.equal(normalized.elevation_gain_m, null);
  assert.equal(normalized.sport_type, "OTHER");
  assert.equal(stravaSummaryActivitiesSchema.safeParse([{ nope: true }]).success, false);
});

test("initial sync uses 30 days and incremental sync uses a 24-hour overlap", () => {
  const syncStartedAt = new Date("2026-09-17T12:00:00Z");
  assert.equal(
    activitySyncAfterEpochSeconds({ syncStartedAt, cursor: null }),
    Math.floor(Date.parse("2026-08-18T12:00:00Z") / 1000),
  );
  assert.equal(
    activitySyncAfterEpochSeconds({ syncStartedAt, cursor: "2026-09-16T10:00:00Z" }),
    Math.floor(Date.parse("2026-09-15T10:00:00Z") / 1000),
  );
});
