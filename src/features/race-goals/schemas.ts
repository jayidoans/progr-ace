import { z } from "zod";

const uuidSchema = z.string().uuid();

const optionalNotesSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(2000).nullable(),
);

const targetFinishTimeSchema = z
  .string()
  .trim()
  .regex(/^\d{1,3}:[0-5]\d:[0-5]\d$/)
  .transform((value) => {
    const [hours, minutes, seconds] = value.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  })
  .pipe(z.number().int().positive().max(3599999));

export const createRaceSchema = z.object({
  name: z.string().trim().min(2).max(160),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const parsedDate = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(parsedDate.valueOf()) && parsedDate.toISOString().slice(0, 10) === value;
    }),
  location: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(160).nullable(),
  ),
  distanceKm: z
    .string()
    .trim()
    .regex(/^\d+(?:\.\d{1,4})?$/)
    .transform((value) => Math.round(Number(value) * 1000))
    .pipe(z.number().int().positive().max(1_000_000)),
});

export const setActiveRaceGoalSchema = z.object({
  raceId: uuidSchema,
  targetFinishTimeSec: targetFinishTimeSchema,
  notes: optionalNotesSchema,
});

export const updateActiveRaceGoalSchema = z.object({
  goalId: uuidSchema,
  targetFinishTimeSec: targetFinishTimeSchema,
  notes: optionalNotesSchema,
});

export const closeRaceGoalSchema = z.object({
  goalId: uuidSchema,
  status: z.literal("CANCELLED"),
});

export const completeCoachedRaceGoalSchema = z.object({
  goalId: uuidSchema,
  athleteId: uuidSchema,
});
