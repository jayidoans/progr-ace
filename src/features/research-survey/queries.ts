import "server-only";
import { getCurrentUserRoles, requireAuthenticatedSession } from "@/src/features/auth/session";
import { RESEARCH_SURVEY_VERSION } from "./domain";

export async function getResearchSurveyStatus() {
  const { supabase, user } = await requireAuthenticatedSession("/survey");
  const roles = await getCurrentUserRoles();
  const canParticipate = roles.includes("ATHLETE") || roles.includes("COACH");
  if (!canParticipate) return { canParticipate: false, submitted: false, isOpen: false, closesAt: null };
  const [{ data, error }, { data: campaign, error: campaignError }] = await Promise.all([
    supabase.from("research_survey_responses").select("id").eq("participant_user_id", user.id).eq("survey_version", RESEARCH_SURVEY_VERSION).maybeSingle(),
    supabase.from("research_survey_campaigns").select("is_open,closes_at").eq("survey_version", RESEARCH_SURVEY_VERSION).maybeSingle(),
  ]);
  if (error) throw new Error("Unable to load survey status.");
  if (campaignError) throw new Error("Unable to load survey availability.");
  return { canParticipate: true, submitted: Boolean(data), isOpen: Boolean(campaign?.is_open && campaign.closes_at && new Date(campaign.closes_at).getTime() > Date.now()), closesAt: campaign?.closes_at ?? null };
}
