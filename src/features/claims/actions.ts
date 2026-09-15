"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  claimActivitySchema,
  claimIdSchema,
  createClaimSchema,
  updateClaimNoteSchema,
} from "@/src/features/claims/schemas";
import { createClient } from "@/src/lib/supabase/server";

async function claimContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=/dashboard/training");
  return { supabase, user };
}

function refreshClaimViews(programId?: string, claimId?: string) {
  revalidatePath("/dashboard/training");
  revalidatePath("/dashboard/activities");
  if (programId) revalidatePath(`/dashboard/training/${programId}`);
  if (claimId) revalidatePath(`/dashboard/claims/${claimId}`);
}

function evidenceError(error: { code?: string } | null) {
  return error?.code === "23505" ? "evidence-already-used" : "evidence-add-failed";
}

export async function createClaimDraft(formData: FormData) {
  const parsed = createClaimSchema.safeParse({
    prescriptionId: formData.get("prescriptionId"),
    programId: formData.get("programId"),
    activityIds: formData.getAll("activityIds"),
    athleteNote: formData.get("athleteNote"),
  });
  if (!parsed.success) redirect("/dashboard/training?error=invalid-claim");
  const { supabase } = await claimContext();
  const { data, error } = await supabase.rpc("create_training_claim_draft", {
    p_prescription_id: parsed.data.prescriptionId,
    p_activity_ids: parsed.data.activityIds,
    p_athlete_note: parsed.data.athleteNote ?? undefined,
  });
  if (error || !data) {
    redirect(
      `/dashboard/training/prescriptions/${parsed.data.prescriptionId}/claim?error=claim-create-failed`,
    );
  }
  refreshClaimViews(parsed.data.programId, data);
  redirect(`/dashboard/claims/${data}?message=draft-created`);
}

export async function updateClaimNote(formData: FormData) {
  const parsed = updateClaimNoteSchema.safeParse({
    claimId: formData.get("claimId"),
    athleteNote: formData.get("athleteNote"),
  });
  if (!parsed.success) redirect("/dashboard/training?error=invalid-claim");
  const { supabase, user } = await claimContext();
  const { data, error } = await supabase
    .from("training_claims")
    .update({ athlete_note: parsed.data.athleteNote })
    .eq("id", parsed.data.claimId)
    .eq("athlete_id", user.id)
    .eq("status", "DRAFT")
    .select("id")
    .maybeSingle();
  if (error || !data) redirect(`/dashboard/claims/${parsed.data.claimId}?error=claim-update-failed`);
  refreshClaimViews(undefined, parsed.data.claimId);
  redirect(`/dashboard/claims/${parsed.data.claimId}?message=note-updated`);
}

export async function addClaimActivity(formData: FormData) {
  const parsed = claimActivitySchema.safeParse({
    claimId: formData.get("claimId"),
    activityId: formData.get("activityId"),
  });
  if (!parsed.success) redirect("/dashboard/training?error=invalid-claim");
  const { supabase } = await claimContext();
  const { error } = await supabase.from("claim_activities").insert({
    claim_id: parsed.data.claimId,
    activity_id: parsed.data.activityId,
  });
  if (error?.code === "23505") {
    const { data: existing } = await supabase
      .from("claim_activities")
      .select("claim_id")
      .eq("claim_id", parsed.data.claimId)
      .eq("activity_id", parsed.data.activityId)
      .maybeSingle();
    if (!existing) {
      redirect(`/dashboard/claims/${parsed.data.claimId}?error=${evidenceError(error)}`);
    }
  } else if (error) {
    redirect(`/dashboard/claims/${parsed.data.claimId}?error=${evidenceError(error)}`);
  }
  refreshClaimViews(undefined, parsed.data.claimId);
  redirect(`/dashboard/claims/${parsed.data.claimId}?message=evidence-added`);
}

export async function removeClaimActivity(formData: FormData) {
  const parsed = claimActivitySchema.safeParse({
    claimId: formData.get("claimId"),
    activityId: formData.get("activityId"),
  });
  if (!parsed.success) redirect("/dashboard/training?error=invalid-claim");
  const { supabase } = await claimContext();
  const { error } = await supabase
    .from("claim_activities")
    .delete()
    .eq("claim_id", parsed.data.claimId)
    .eq("activity_id", parsed.data.activityId);
  if (error) redirect(`/dashboard/claims/${parsed.data.claimId}?error=evidence-remove-failed`);
  refreshClaimViews(undefined, parsed.data.claimId);
  redirect(`/dashboard/claims/${parsed.data.claimId}?message=evidence-removed`);
}

export async function submitClaim(formData: FormData) {
  const claimId = claimIdSchema.safeParse(formData.get("claimId"));
  if (!claimId.success) redirect("/dashboard/training?error=invalid-claim");
  const { supabase } = await claimContext();
  const { error } = await supabase.rpc("submit_training_claim", { p_claim_id: claimId.data });
  if (error) redirect(`/dashboard/claims/${claimId.data}?error=claim-submit-failed`);
  refreshClaimViews(undefined, claimId.data);
  redirect(`/dashboard/claims/${claimId.data}?message=submitted`);
}

export async function deleteClaimDraft(formData: FormData) {
  const claimId = claimIdSchema.safeParse(formData.get("claimId"));
  if (!claimId.success) redirect("/dashboard/training?error=invalid-claim");
  const { supabase } = await claimContext();
  const { error } = await supabase.rpc("delete_training_claim_draft", { p_claim_id: claimId.data });
  if (error) redirect(`/dashboard/claims/${claimId.data}?error=claim-delete-failed`);
  refreshClaimViews();
  redirect("/dashboard/training?message=claim-deleted");
}
