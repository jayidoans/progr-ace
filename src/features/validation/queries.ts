import "server-only";

import { notFound, redirect } from "next/navigation";

import { claimIdSchema } from "@/src/features/claims/schemas";
import { createClient } from "@/src/lib/supabase/server";
import type { Tables } from "@/src/types/database";
import type { ValidationWithChecks } from "@/src/features/validation/types";

type ReviewPrescription = Tables<"training_prescriptions"> & {
  components: Tables<"prescription_components">[];
  training_week: Tables<"training_weeks"> & {
    program: Tables<"training_programs"> & {
      race_goal: Tables<"athlete_race_goals"> & {
        race: Tables<"races">;
      };
    };
  };
};

type ReviewEvidence = Tables<"claim_activities"> & { activity: Tables<"activities"> };

export type ValidationReviewDetail = ValidationWithChecks & {
  claim: Tables<"training_claims"> & {
    athlete: Pick<Tables<"profiles">, "id" | "full_name" | "email">;
    evidence: ReviewEvidence[];
    prescription: ReviewPrescription;
  };
};

const reviewSelection = `
  *,
  checks:validation_checks (*),
  claim:training_claims (
    *,
    athlete:profiles (id, full_name, email),
    evidence:claim_activities (*, activity:activities (*)),
    prescription:training_prescriptions (
      *,
      components:prescription_components (*),
      training_week:training_weeks (
        *,
        program:training_programs (
          *,
          race_goal:athlete_race_goals (*, race:races (*))
        )
      )
    )
  )
`;

async function reviewerContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=/dashboard/validation");

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role:roles(name)")
    .eq("user_id", user.id);
  if (roleError) throw new Error("Unable to determine validation access.");
  const roles = roleRows.map((row) => row.role.name);
  if (!roles.includes("COACH") && !roles.includes("ADMIN")) notFound();
  return { supabase, user, roles };
}

function normalizeReview(review: ValidationReviewDetail): ValidationReviewDetail {
  review.checks.sort((left, right) => left.sequence_order - right.sequence_order);
  review.claim.evidence.sort((left, right) =>
    left.activity.started_at.localeCompare(right.activity.started_at),
  );
  review.claim.prescription.components.sort(
    (left, right) => left.sequence_order - right.sequence_order,
  );
  return review;
}

export async function getValidationReviewQueue(): Promise<ValidationReviewDetail[]> {
  const { supabase } = await reviewerContext();
  const { data, error } = await supabase
    .from("claim_validations")
    .select(reviewSelection)
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Unable to load the validation review queue.");
  return (data as ValidationReviewDetail[]).map(normalizeReview);
}

export async function getValidationReview(claimId: string): Promise<ValidationReviewDetail> {
  const parsedId = claimIdSchema.safeParse(claimId);
  if (!parsedId.success) notFound();
  const { supabase } = await reviewerContext();
  const { data, error } = await supabase
    .from("claim_validations")
    .select(reviewSelection)
    .eq("claim_id", parsedId.data)
    .maybeSingle();
  if (error) throw new Error("Unable to load the validation review.");
  if (!data) notFound();
  return normalizeReview(data as ValidationReviewDetail);
}
