import { z } from "zod";

import {
  ACTIVITY_SPORT_TYPES,
  kilometersToMeters,
  localDateTimeToIso,
  parseDuration,
} from "@/src/features/activities/format";

const optionalInteger = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.coerce.number().int().positive().max(maximum).nullable(),
  );

const optionalRpe = optionalInteger(10);
const optionalNotes = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(4000).nullable(),
);

export const activityIdSchema = z.string().uuid();

export const stravaActivityContextSchema = z.object({
  activityId: activityIdSchema,
  rpe: optionalRpe,
  notes: optionalNotes,
});

export const activityFormSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    sportType: z.enum(ACTIVITY_SPORT_TYPES),
    startedAt: z.string(),
    timezoneOffsetMinutes: z.coerce.number().int().min(-840).max(840),
    distanceKm: z.string().transform(kilometersToMeters).pipe(z.number().int().min(0).max(1_000_000).nullable()),
    duration: z.string().transform(parseDuration).pipe(z.number().int().min(0).max(604_800).nullable()),
    averageHrBpm: optionalInteger(300),
    maxHrBpm: optionalInteger(300),
    elevationGainM: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? null : value),
      z.coerce.number().int().min(0).max(20_000).nullable(),
    ),
    rpe: optionalRpe,
    notes: optionalNotes,
  })
  .transform((data, context) => {
    const startedAtIso = localDateTimeToIso(data.startedAt, data.timezoneOffsetMinutes);
    if (!startedAtIso) {
      context.addIssue({ code: "custom", path: ["startedAt"], message: "Invalid activity date." });
      return z.NEVER;
    }
    if (data.sportType === "RUNNING" && !(data.distanceKm || data.duration)) {
      context.addIssue({
        code: "custom",
        path: ["distanceKm"],
        message: "A run needs a distance or duration.",
      });
    }
    if (data.averageHrBpm && data.maxHrBpm && data.maxHrBpm < data.averageHrBpm) {
      context.addIssue({
        code: "custom",
        path: ["maxHrBpm"],
        message: "Maximum heart rate cannot be lower than average heart rate.",
      });
    }
    return { ...data, startedAtIso };
  });
