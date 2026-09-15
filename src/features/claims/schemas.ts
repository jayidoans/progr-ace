import { z } from "zod";

const uuid = z.string().uuid();

const athleteNote = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(4000).nullable(),
);

export const claimIdSchema = uuid;
export const prescriptionIdSchema = uuid;

export const createClaimSchema = z.object({
  prescriptionId: uuid,
  programId: uuid,
  activityIds: z.array(uuid).min(1).max(20).refine((ids) => new Set(ids).size === ids.length),
  athleteNote,
});

export const updateClaimNoteSchema = z.object({
  claimId: uuid,
  athleteNote,
});

export const claimActivitySchema = z.object({
  claimId: uuid,
  activityId: uuid,
});
