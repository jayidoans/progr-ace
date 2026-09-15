import { z } from "zod";

import { COACH_DECISIONS } from "@/src/features/validation/types";

const reviewerNote = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(4000).nullable(),
);

export const reviewValidationSchema = z
  .object({
    claimId: z.string().uuid(),
    result: z.enum(COACH_DECISIONS),
    reviewerNote,
  })
  .superRefine((value, context) => {
    if ((value.result === "PARTIAL" || value.result === "REJECTED") && !value.reviewerNote) {
      context.addIssue({
        code: "custom",
        path: ["reviewerNote"],
        message: "A reviewer note is required for Partial or Rejected decisions.",
      });
    }
  });
