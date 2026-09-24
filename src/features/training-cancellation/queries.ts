import "server-only";

import { requireAuthenticatedSession } from "@/src/features/auth/session";
import type { Tables } from "@/src/types/database";

export type TrainingProgramCancellationRequest = Tables<"training_program_cancellation_requests">;

export async function getTrainingProgramCancellationContext(programId: string) {
  const { supabase } = await requireAuthenticatedSession(`/dashboard/training/${programId}`);
  const [programResult, requestsResult] = await Promise.all([
    supabase
      .from("training_programs")
      .select("id, status, race_goal_id, created_by, cancelled_at, cancelled_by, cancellation_reason")
      .eq("id", programId)
      .maybeSingle(),
    supabase
      .from("training_program_cancellation_requests")
      .select("*")
      .eq("training_program_id", programId)
      .order("requested_at", { ascending: false }),
  ]);
  if (programResult.error || requestsResult.error) {
    throw new Error("Unable to load Training Program cancellation history.");
  }
  if (!programResult.data) return null;
  return {
    program: programResult.data,
    requests: requestsResult.data as TrainingProgramCancellationRequest[],
  };
}
