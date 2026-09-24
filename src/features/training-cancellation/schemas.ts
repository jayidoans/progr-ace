import { z } from "zod";

const uuid = z.string().uuid();
const reason = z.string().trim().min(1).max(1000);

export const requestCancellationSchema = z.object({
  programId: uuid,
  reason,
});

export const reviewCancellationSchema = z.object({
  requestId: uuid,
  decision: z.enum(["APPROVED", "DECLINED"]),
  reviewReason: z.string().trim().max(1000).optional().nullable(),
});

export const directCancellationSchema = z.object({
  programId: uuid,
  reason,
});

export const deleteDraftProgramSchema = z.object({ programId: uuid });
