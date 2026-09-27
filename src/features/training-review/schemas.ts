import { z } from "zod";

const comment = z.string().trim().min(1, "Add a comment before saving.").max(4000);

export const activityCommentSchema = z.object({
  claimActivityId: z.string().uuid(),
  coachComment: comment,
  programId: z.string().uuid(),
});

export const weekReviewSchema = z.object({
  coachComment: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(4000).nullable(),
  ),
  fulfillmentRating: z.coerce.number().int().min(0).max(10),
  programId: z.string().uuid(),
  trainingWeekId: z.string().uuid(),
});
