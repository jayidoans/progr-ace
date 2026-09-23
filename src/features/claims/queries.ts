import "server-only";

import { notFound } from "next/navigation";

import { activityListCutoff } from "@/src/features/activities/listing";
import { requireAuthenticatedSession } from "@/src/features/auth/session";
import { prepareClaimCandidates } from "@/src/features/claims/candidates";
import { claimIdSchema, prescriptionIdSchema } from "@/src/features/claims/schemas";
import type { Tables } from "@/src/types/database";
import type { ValidationWithChecks } from "@/src/features/validation/types";

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
  validation: ValidationWithChecks | null;
};
export type AthleteClaimSummary = Claim & {
  prescription: Pick<
    Tables<"training_prescriptions">,
    "id" | "scheduled_date" | "title" | "training_menu"
  >;
  validation: Pick<Tables<"claim_validations">, "result" | "evaluation_source"> | null;
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
  return requireAuthenticatedSession("/dashboard/training");
}

function availableActivityQuery(
  supabase: Awaited<ReturnType<typeof claimContext>>["supabase"],
  athleteId: string,
) {
  return supabase
    .from("activities")
    .select("*, claim_usage:claim_activities!left(activity_id)")
    .eq("athlete_id", athleteId)
    .gte("started_at", activityListCutoff())
    .is("claim_usage", null)
    .order("started_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(30);
}

function removeClaimUsage(
  activities: (Tables<"activities"> & { claim_usage: { activity_id: string }[] })[],
) {
  return activities.map(({ claim_usage: claimUsage, ...activity }) => {
    if (claimUsage.length > 0) throw new Error("Claimed evidence cannot be offered as a candidate.");
    return activity;
  });
}

export async function getClaimBuilder(prescriptionId: string) {
  const parsedId = prescriptionIdSchema.safeParse(prescriptionId);
  if (!parsedId.success) notFound();
  const { supabase, user } = await claimContext();

  const [prescriptionResult, activitiesResult, existingResult] = await Promise.all([
    supabase
      .from("training_prescriptions")
      .select(prescriptionSelection)
      .eq("id", parsedId.data)
      .maybeSingle(),
    availableActivityQuery(supabase, user.id),
    supabase.from("training_claims").select("id").eq("prescription_id", parsedId.data).maybeSingle(),
  ]);

  if (prescriptionResult.error || activitiesResult.error || existingResult.error) {
    throw new Error("Unable to load claim preparation data.");
  }
  if (!prescriptionResult.data) notFound();

  const prescription = prescriptionResult.data as ClaimPrescription;
  if (
    prescription.training_week.program.status !== "PUBLISHED" ||
    prescription.training_week.planning_status !== "PUBLISHED" ||
    prescription.training_week.program.race_goal.athlete_id !== user.id
  ) {
    notFound();
  }

  return {
    prescription,
    programId: prescription.training_week.program.id,
    existingClaimId: existingResult.data?.id ?? null,
    candidates: prepareClaimCandidates(
      removeClaimUsage(activitiesResult.data),
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
      evidence:claim_activities (*, activity:activities (*)),
      validation:claim_validations (*, checks:validation_checks (*))
    `)
    .eq("id", parsedId.data)
    .eq("athlete_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Unable to load the claim.");
  if (!data) notFound();

  const claim = data as ClaimDetail;
  claim.prescription.components.sort((a, b) => a.sequence_order - b.sequence_order);
  claim.evidence.sort((a, b) => a.activity.started_at.localeCompare(b.activity.started_at));
  claim.validation?.checks.sort((a, b) => a.sequence_order - b.sequence_order);
  return claim;
}

export async function getAvailableActivitiesForClaim(claim: ClaimDetail) {
  const { supabase, user } = await claimContext();
  if (claim.status !== "DRAFT" || claim.athlete_id !== user.id) return [];
  const activitiesResult = await availableActivityQuery(supabase, user.id);
  if (activitiesResult.error) throw new Error("Unable to load available evidence.");
  return prepareClaimCandidates(
    removeClaimUsage(activitiesResult.data),
    claim.prescription.scheduled_date,
  );
}

export async function getAthleteClaims(limit = 5): Promise<AthleteClaimSummary[]> {
  const { supabase, user } = await claimContext();
  const { data, error } = await supabase
    .from("training_claims")
    .select("*, prescription:training_prescriptions(id, scheduled_date, title, training_menu), validation:claim_validations(result, evaluation_source)")
    .eq("athlete_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Unable to load training claims.");
  return data as AthleteClaimSummary[];
}
