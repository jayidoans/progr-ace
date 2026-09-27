"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { activityCommentSchema, weekReviewSchema } from "@/src/features/training-review/schemas";
import { createClient } from "@/src/lib/supabase/server";

function destination(programId: FormDataEntryValue | null, feedback: string) {
  const id = typeof programId === "string" ? programId : "";
  return `/dashboard/training/${id}?${feedback}`;
}

export async function saveActivityComment(formData: FormData) {
  const parsed = activityCommentSchema.safeParse({
    claimActivityId: formData.get("claimActivityId"),
    coachComment: formData.get("coachComment"),
    programId: formData.get("programId"),
  });
  if (!parsed.success) redirect(destination(formData.get("programId"), "error=invalid-activity-comment"));

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_training_activity_comment", {
    p_claim_activity_id: parsed.data.claimActivityId,
    p_coach_comment: parsed.data.coachComment,
  });
  if (error) redirect(destination(parsed.data.programId, "error=activity-comment-failed"));

  revalidatePath(`/dashboard/training/${parsed.data.programId}`);
  redirect(destination(parsed.data.programId, "message=activity-comment-saved"));
}

export async function saveWeekReview(formData: FormData) {
  const parsed = weekReviewSchema.safeParse({
    coachComment: formData.get("coachComment"),
    fulfillmentRating: formData.get("fulfillmentRating"),
    programId: formData.get("programId"),
    trainingWeekId: formData.get("trainingWeekId"),
  });
  if (!parsed.success) redirect(destination(formData.get("programId"), "error=invalid-week-review"));

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_training_week_review", {
    p_coach_comment: parsed.data.coachComment,
    p_fulfillment_rating: parsed.data.fulfillmentRating,
    p_training_week_id: parsed.data.trainingWeekId,
  });
  if (error) redirect(destination(parsed.data.programId, "error=week-review-failed"));

  revalidatePath(`/dashboard/training/${parsed.data.programId}`);
  redirect(destination(parsed.data.programId, "message=week-review-saved"));
}
