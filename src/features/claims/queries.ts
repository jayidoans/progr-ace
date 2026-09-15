import "server-only";

import { notFound, redirect } from "next/navigation";

import { claimIdSchema, prescriptionIdSchema } from "@/src/features/claims/schemas";
import { createClient } from "@/src/lib/supabase/server";
import type { Tables } from "@/src/types/database";

export type Claim = Tables<"training_claims">;
export type ClaimActivity = Tables<"claim_activities">;
export type ClaimEvidence = ClaimActivity & { activity: Tables<"activities"> };
export type ClaimPrescription = Tables<"training_prescriptions"> & {
  components: Tables<"prescription_components">[];
  training_week: Tables<"training_weeks"> & {
    program: Tables<"training_programs"> & {
      race_goal: Pick<Tables<"athlete_race_goals">, "athlete_id">;
    };
  };
};
export type ClaimDetail = Claim & {
  prescription: ClaimPrescription;
  evidence: ClaimEvidence[];
};
export type AthleteClaimSummary = Claim & {
  prescription: Pick<
    Tables<"training_prescriptions">,
    "id" | "scheduled_date" | "title" | "training_menu"
  >;
};

const prescriptionSelection = `
  *,
  components:prescription_components (*),
  training_week:training_weeks (
    *,
    program:training_programs (
      *,
      race_goal:athlete_race_goals (athlete_id)
    )
  )
`;

async function claimContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=/dashboard/training");
  return { supabase, user };
}

function sortByScheduledDate<T extends Tables<"activities">>(activities: T[], scheduledDate: string) {
  const scheduled = new Date(`${scheduledDate}T12:00:00Z`).valueOf();
  return activities.sort(
    (left, right) =>
      Math.abs(new Date(left.started_at).valueOf() - scheduled) -
      Math.abs(new Date(right.started_at).valueOf() - scheduled),
  );
}

export async function getClaimBuilder(prescriptionId: string) {
  const parsedId = prescriptionIdSchema.safeParse(prescriptionId);
  if (!parsedId.success) notFound();
  const { supabase, user } = await claimContext();

  const [prescriptionResult, activitiesResult, claimedResult, existingResult] = await Promise.all([
    supabase
      .from("training_prescriptions")
      .select(prescriptionSelection)
      .eq("id", parsedId.data)
      .maybeSingle(),
    supabase.from("activities").select("*").eq("athlete_id", user.id).order("started_at", { ascending: false }),
    supabase.from("claim_activities").select("activity_id"),
    supabase.from("training_claims").select("id").eq("prescription_id", parsedId.data).maybeSingle(),
  ]);

  if (prescriptionResult.error || activitiesResult.error || claimedResult.error || existingResult.error) {
    throw new Error("Unable to load claim preparation data.");
  }
  if (!prescriptionResult.data) notFound();

  const prescription = prescriptionResult.data as ClaimPrescription;
  if (
    prescription.training_week.program.status !== "PUBLISHED" ||
    prescription.training_week.program.race_goal.athlete_id !== user.id
  ) {
    notFound();
  }

  const usedActivityIds = new Set(claimedResult.data.map((row) => row.activity_id));
  return {
    prescription,
    programId: prescription.training_week.program.id,
    existingClaimId: existingResult.data?.id ?? null,
    candidates: sortByScheduledDate(
      activitiesResult.data.filter((activity) => !usedActivityIds.has(activity.id)),
      prescription.scheduled_date,
    ),
  };
}

export async function getClaim(claimId: string): Promise<ClaimDetail> {
  const parsedId = claimIdSchema.safeParse(claimId);
  if (!parsedId.success) notFound();
  const { supabase, user } = await claimContext();
  const { data, error } = await supabase
    .from("training_claims")
    .select(`
      *,
      prescription:training_prescriptions (${prescriptionSelection}),
      evidence:claim_activities (*, activity:activities (*))
    `)
    .eq("id", parsedId.data)
    .eq("athlete_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Unable to load the claim.");
  if (!data) notFound();

  const claim = data as ClaimDetail;
  claim.prescription.components.sort((a, b) => a.sequence_order - b.sequence_order);
  claim.evidence.sort((a, b) => a.activity.started_at.localeCompare(b.activity.started_at));
  return claim;
}

export async function getAvailableActivitiesForClaim(claim: ClaimDetail) {
  const { supabase, user } = await claimContext();
  if (claim.status !== "DRAFT" || claim.athlete_id !== user.id) return [];
  const [activitiesResult, usedResult] = await Promise.all([
    supabase.from("activities").select("*").eq("athlete_id", user.id),
    supabase.from("claim_activities").select("activity_id"),
  ]);
  if (activitiesResult.error || usedResult.error) throw new Error("Unable to load available evidence.");
  const used = new Set(usedResult.data.map((row) => row.activity_id));
  return sortByScheduledDate(
    activitiesResult.data.filter((activity) => !used.has(activity.id)),
    claim.prescription.scheduled_date,
  );
}

export async function getAthleteClaims(limit = 5): Promise<AthleteClaimSummary[]> {
  const { supabase, user } = await claimContext();
  const { data, error } = await supabase
    .from("training_claims")
    .select("*, prescription:training_prescriptions(id, scheduled_date, title, training_menu)")
    .eq("athlete_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Unable to load training claims.");
  return data as AthleteClaimSummary[];
}
