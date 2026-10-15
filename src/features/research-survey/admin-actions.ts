"use server";

import { redirect } from "next/navigation";
import { getCurrentUserRoles, requireAuthenticatedSession } from "@/src/features/auth/session";
import { assertDemoFeatureAvailable } from "@/src/features/demo/server";

export async function setResearchSurveyCampaign(formData: FormData) {
  assertDemoFeatureAvailable("domain-mutations");
  const { supabase } = await requireAuthenticatedSession("/dashboard/admin/survey");
  const roles = await getCurrentUserRoles();
  if (!roles.includes("ADMIN")) redirect("/dashboard");

  const isOpen = formData.get("isOpen") === "true";
  const closeDate = String(formData.get("closesAt") ?? "").trim();
  const closesAt = isOpen && closeDate ? new Date(`${closeDate}:00+07:00`) : null;
  if (isOpen && (!closesAt || Number.isNaN(closesAt.getTime()) || closesAt.getTime() <= Date.now())) {
    redirect("/dashboard/admin/survey?message=invalid-close-date");
  }
  const { error } = await supabase.rpc("set_research_survey_campaign", {
    p_is_open: isOpen,
    p_closes_at: closesAt?.toISOString() ?? null,
  });
  redirect(`/dashboard/admin/survey?message=${error ? "save-failed" : isOpen ? "opened" : "closed"}`);
}
