import assert from "node:assert/strict";
import test from "node:test";

import {
  activityCalendarDayOffset,
  formatActivityDayProximity,
  groupClaimCandidates,
  prepareClaimCandidates,
} from "./candidates";
import type { Tables } from "@/src/types/database";

function activity(
  id: string,
  startedAt: string,
  source: "MANUAL" | "STRAVA" = "MANUAL",
): Tables<"activities"> {
  return {
    athlete_id: "athlete-id",
    average_hr_bpm: null,
    created_at: startedAt,
    distance_m: 5000,
    duration_sec: 1800,
    elevation_gain_m: null,
    external_activity_id: source === "STRAVA" ? id : null,
    id,
    max_hr_bpm: null,
    name: `${source} activity`,
    notes: null,
    raw_data: null,
    rpe: null,
    source,
    sport_type: "RUNNING",
    started_at: startedAt,
    updated_at: startedAt,
  };
}

test("calendar-day offsets use UTC dates rather than elapsed-hour distance", () => {
  assert.equal(activityCalendarDayOffset("2026-09-17", "2026-09-17T23:59:59.000Z"), 0);
  assert.equal(activityCalendarDayOffset("2026-09-17", "2026-09-16T23:59:59.000Z"), -1);
  assert.equal(activityCalendarDayOffset("2026-09-17", "2026-09-18T00:00:00.000Z"), 1);
});

test("proximity labels describe same-day, before, and after dates", () => {
  assert.equal(formatActivityDayProximity(0), "Same day");
  assert.equal(formatActivityDayProximity(-1), "1 day before");
  assert.equal(formatActivityDayProximity(1), "1 day after");
  assert.equal(formatActivityDayProximity(-2), "2 days before");
  assert.equal(formatActivityDayProximity(4), "4 days after");
});

test("candidates within plus or minus three calendar days are grouped as near", () => {
  const grouped = groupClaimCandidates(
    prepareClaimCandidates(
      [
        activity("minus-four", "2026-09-13T12:00:00.000Z"),
        activity("minus-three", "2026-09-14T12:00:00.000Z"),
        activity("plus-three", "2026-09-20T12:00:00.000Z"),
        activity("plus-four", "2026-09-21T12:00:00.000Z"),
      ],
      "2026-09-17",
    ),
  );

  assert.deepEqual(grouped.near.map((candidate) => candidate.id), ["plus-three", "minus-three"]);
  assert.deepEqual(grouped.other.map((candidate) => candidate.id), ["plus-four", "minus-four"]);
});

test("MANUAL and STRAVA remain equivalent candidates and near dates sort first", () => {
  const candidates = prepareClaimCandidates(
    [
      activity("manual-old", "2026-09-10T08:00:00.000Z", "MANUAL"),
      activity("strava-near", "2026-09-17T08:00:00.000Z", "STRAVA"),
    ],
    "2026-09-17",
  );

  assert.deepEqual(candidates.map((candidate) => candidate.source), ["STRAVA", "MANUAL"]);
  assert.equal(candidates[0].proximityLabel, "Same day");
});
