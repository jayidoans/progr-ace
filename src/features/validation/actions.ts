"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { reviewValidationSchema } from "@/src/features/validation/schemas";
import { createClient } from "@/src/lib/supabase/server";

export async function reviewTrainingClaim(formData: FormData) {
  const parsed = reviewValidationSchema.safeParse({
    claimId: formData.get("claimId"),
    result: formData.get("result"),
    reviewerNote: formData.get("reviewerNote"),
  });
  if (!parsed.success) {
    const claimId = formData.get("claimId");
    const destination = typeof claimId === "string" ? claimId : "";
    redirect(`/dashboard/validation/${destination}?error=invalid-review`);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login?next=/dashboard/validation");

  const { error } = await supabase.rpc("review_training_claim", {
    p_claim_id: parsed.data.claimId,
    p_result: parsed.data.result,
    p_reviewer_note: parsed.data.reviewerNote ?? undefined,
  });
  if (error) redirect(`/dashboard/validation/${parsed.data.claimId}?error=review-failed`);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/training");
  revalidatePath("/dashboard/validation");
  revalidatePath(`/dashboard/validation/${parsed.data.claimId}`);
  revalidatePath(`/dashboard/claims/${parsed.data.claimId}`);
  redirect(`/dashboard/validation/${parsed.data.claimId}?message=review-saved`);
}
