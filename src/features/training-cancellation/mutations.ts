import "server-only";

import { requireAuthenticatedSession } from "@/src/features/auth/session";

import {
  deleteDraftProgramSchema,
  directCancellationSchema,
  requestCancellationSchema,
  reviewCancellationSchema,
} from "./schemas";

function mutationError(operation: string) {
  return new Error(`${operation} failed.`);
}

export async function requestTrainingProgramCancellation(input: unknown) {
  const parsed = requestCancellationSchema.parse(input);
  const { supabase } = await requireAuthenticatedSession();
  const { data, error } = await supabase.rpc("request_training_program_cancellation", {
    p_program_id: parsed.programId,
    p_request_reason: parsed.reason,
  });
  if (error || !data) throw mutationError("Cancellation request");
  return data;
}

export async function reviewTrainingProgramCancellation(input: unknown) {
  const parsed = reviewCancellationSchema.parse(input);
  const { supabase } = await requireAuthenticatedSession();
  const { data, error } = await supabase.rpc("review_training_program_cancellation", {
    p_request_id: parsed.requestId,
    p_decision: parsed.decision,
    p_review_reason: parsed.reviewReason || undefined,
  });
  if (error || !data) throw mutationError("Cancellation review");
  return data;
}

export async function cancelTrainingProgram(input: unknown) {
  const parsed = directCancellationSchema.parse(input);
  const { supabase } = await requireAuthenticatedSession();
  const { data, error } = await supabase.rpc("cancel_training_program", {
    p_program_id: parsed.programId,
    p_cancellation_reason: parsed.reason,
  });
  if (error || !data) throw mutationError("Program cancellation");
  return data;
}

export async function deleteDraftTrainingProgram(input: unknown) {
  const parsed = deleteDraftProgramSchema.parse(input);
  const { supabase } = await requireAuthenticatedSession();
  const { data, error } = await supabase.rpc("delete_draft_training_program", {
    p_program_id: parsed.programId,
  });
  if (error || !data) throw mutationError("Draft Program deletion");
  return data;
}
