import { z } from "zod";

import type { Json } from "@/src/types/database";

export const STRAVA_ACTIVITY_PER_PAGE = 100;
export const STRAVA_ACTIVITY_MAX_PAGES = 10;
export const STRAVA_INITIAL_SYNC_DAYS = 30;
export const STRAVA_INCREMENTAL_OVERLAP_HOURS = 24;
export const STRAVA_ACTIVITY_SYNCS_PER_HOUR = 2;

const optionalMetric = z.number().finite().nonnegative().nullable().optional();
const optionalHeartRate = z.number().finite().positive().max(300).nullable().optional();

export const stravaSummaryActivitySchema = z
  .object({
    id: z.number().int().positive().safe(),
    name: z.string().max(500),
    sport_type: z.string().min(1).max(100),
    type: z.string().min(1).max(100).nullable().optional(),
    start_date: z.iso.datetime({ offset: true }),
    distance: optionalMetric,
    moving_time: z.number().int().nonnegative().max(31_536_000),
    elapsed_time: z.number().int().nonnegative().max(31_536_000).optional(),
    total_elevation_gain: optionalMetric,
    average_heartrate: optionalHeartRate,
    max_heartrate: optionalHeartRate,
    trainer: z.boolean().optional(),
    commute: z.boolean().optional(),
    private: z.boolean().optional(),
    visibility: z.string().max(50).optional(),
  })
  .passthrough();

export const stravaSummaryActivitiesSchema = z.array(stravaSummaryActivitySchema);

export type StravaSummaryActivity = z.infer<typeof stravaSummaryActivitySchema>;
export type NormalizedStravaActivity = {
  external_activity_id: string;
  name: string;
  sport_type: "RUNNING" | "STRENGTH_TRAINING" | "WALKING" | "CYCLING" | "PADEL" | "OTHER";
  started_at: string;
  distance_m: number | null;
  duration_sec: number;
  average_hr_bpm: number | null;
  max_hr_bpm: number | null;
  elevation_gain_m: number | null;
  raw_data: Json;
};

export function normalizeStravaSportType(
  sportType: string,
): NormalizedStravaActivity["sport_type"] {
  if (["Run", "TrailRun", "VirtualRun"].includes(sportType)) return "RUNNING";
  if (["Walk", "Hike"].includes(sportType)) return "WALKING";
  if (
    [
      "Ride",
      "MountainBikeRide",
      "GravelRide",
      "VirtualRide",
      "EBikeRide",
      "EMountainBikeRide",
      "Velomobile",
    ].includes(sportType)
  ) {
    return "CYCLING";
  }
  if (sportType === "WeightTraining") return "STRENGTH_TRAINING";
  if (sportType === "Padel") return "PADEL";
  return "OTHER";
}

function rounded(value: number | null | undefined) {
  return value === null || value === undefined ? null : Math.round(value);
}

export function normalizeStravaActivity(
  activity: StravaSummaryActivity,
): NormalizedStravaActivity {
  const rawData: Record<string, Json | undefined> = {
    sport_type: activity.sport_type,
    type: activity.type ?? undefined,
    elapsed_time: activity.elapsed_time,
    moving_time: activity.moving_time,
    trainer: activity.trainer,
    commute: activity.commute,
    private: activity.private,
    visibility: activity.visibility,
  };

  return {
    external_activity_id: String(activity.id),
    name: activity.name.trim() || "Strava activity",
    sport_type: normalizeStravaSportType(activity.sport_type),
    started_at: new Date(activity.start_date).toISOString(),
    distance_m: rounded(activity.distance),
    duration_sec: activity.moving_time,
    average_hr_bpm: rounded(activity.average_heartrate),
    max_hr_bpm: rounded(activity.max_heartrate),
    elevation_gain_m: rounded(activity.total_elevation_gain),
    raw_data: Object.fromEntries(
      Object.entries(rawData).filter((entry): entry is [string, Json] => entry[1] !== undefined),
    ),
  };
}

export function activitySyncAfterEpochSeconds(input: {
  syncStartedAt: Date;
  cursor: string | null;
}) {
  const cursorMillis = input.cursor ? Date.parse(input.cursor) : Number.NaN;
  const lowerBoundMillis = Number.isNaN(cursorMillis)
    ? input.syncStartedAt.valueOf() - STRAVA_INITIAL_SYNC_DAYS * 86_400_000
    : cursorMillis - STRAVA_INCREMENTAL_OVERLAP_HOURS * 3_600_000;
  return Math.floor(lowerBoundMillis / 1000);
}

export function availableActivitySyncsThisHour(input: {
  hourStartedAt: string | null;
  attemptCount: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const currentHour = new Date(now);
  currentHour.setUTCMinutes(0, 0, 0);
  const recordedHour = input.hourStartedAt ? new Date(input.hourStartedAt) : null;
  const attempts = recordedHour?.valueOf() === currentHour.valueOf() ? input.attemptCount : 0;
  return Math.max(0, STRAVA_ACTIVITY_SYNCS_PER_HOUR - attempts);
}
