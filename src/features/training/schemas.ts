import { z } from "zod";

import { TRAINING_MENUS, WORKOUT_TYPES } from "@/src/features/training-import/template";

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
});
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max).nullable(),
  );
const optionalPositiveInteger = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  z.coerce.number().int().positive().max(1_000_000).nullable(),
);

export const createProgramSchema = z
  .object({
    raceGoalId: uuid,
    name: z.string().trim().min(2).max(160),
    description: optionalText(2000),
    startDate: date,
  });

export const addWeekSchema = z
  .object({
    programId: uuid,
    weekNumber: z.coerce.number().int().positive().max(52),
    phase: z.string().trim().min(1).max(80),
    startDate: date,
    endDate: date,
  })
  .refine((value) => {
    const start = new Date(`${value.startDate}T00:00:00Z`);
    const end = new Date(`${value.endDate}T00:00:00Z`);
    return start.getUTCDay() === 1 && end.getUTCDay() === 0 && end.valueOf() - start.valueOf() === 6 * 86400000;
  });

const componentFields = {
  componentType: z.enum(WORKOUT_TYPES),
  sequenceOrder: z.coerce.number().int().positive().max(20),
  targetDistanceM: optionalPositiveInteger,
  targetDurationSec: optionalPositiveInteger,
  repetitions: optionalPositiveInteger,
  distancePerRepM: optionalPositiveInteger,
  recoveryDurationSec: optionalPositiveInteger,
  targetPaceMinSecPerKm: optionalPositiveInteger,
  targetPaceMaxSecPerKm: optionalPositiveInteger,
  instruction: optionalText(2000),
};

function hasComponentDetail(value: Record<string, unknown>) {
  return [
    "targetDistanceM",
    "targetDurationSec",
    "repetitions",
    "distancePerRepM",
    "recoveryDurationSec",
    "targetPaceMinSecPerKm",
    "targetPaceMaxSecPerKm",
    "instruction",
  ].some((key) => value[key] !== null);
}

export const addPrescriptionSchema = z
  .object({
    programId: uuid,
    trainingWeekId: uuid,
    trainingMenu: z.enum(TRAINING_MENUS),
    scheduledDate: date,
    title: z.string().trim().min(2).max(160),
    description: optionalText(2000),
    ...componentFields,
  })
  .refine(hasComponentDetail)
  .refine(
    (value) =>
      value.targetPaceMinSecPerKm === null ||
      value.targetPaceMaxSecPerKm === null ||
      value.targetPaceMinSecPerKm <= value.targetPaceMaxSecPerKm,
  );

export const addComponentSchema = z
  .object({
    programId: uuid,
    prescriptionId: uuid,
    ...componentFields,
  })
  .refine(hasComponentDetail)
  .refine(
    (value) =>
      value.targetPaceMinSecPerKm === null ||
      value.targetPaceMaxSecPerKm === null ||
      value.targetPaceMinSecPerKm <= value.targetPaceMaxSecPerKm,
  );

export const plannerComponentSchema = z
  .object(componentFields)
  .omit({ sequenceOrder: true })
  .refine(hasComponentDetail)
  .refine(
    (value) =>
      value.targetPaceMinSecPerKm === null ||
      value.targetPaceMaxSecPerKm === null ||
      value.targetPaceMinSecPerKm <= value.targetPaceMaxSecPerKm,
  );

export const startWeeklyPlanSchema = z.object({
  programId: uuid,
  weekDate: date,
});

const weeklySessionFields = {
  programId: uuid,
  trainingMenu: z.enum(TRAINING_MENUS),
  scheduledDate: date,
  title: z.string().trim().min(2).max(160),
  description: optionalText(2000),
  components: z.array(plannerComponentSchema).min(1).max(20),
};

export const createWeeklySessionSchema = z.object({
  ...weeklySessionFields,
  weekId: uuid,
});

export const updateWeeklySessionSchema = z.object({
  ...weeklySessionFields,
  prescriptionId: uuid,
});

export const deleteWeeklySessionSchema = z.object({
  programId: uuid,
  prescriptionId: uuid,
});

export const publishWeeklyPlanSchema = z.object({
  programId: uuid,
  weekId: uuid,
});

export const programIdSchema = z.object({ programId: uuid });

export const copyProgramSchema = z.object({
  sourceProgramId: uuid,
  destinationRaceGoalId: uuid,
});

export const importUploadSchema = z.object({
  raceGoalId: uuid,
  name: z.string().trim().min(2).max(160),
  description: optionalText(2000),
});
