import "server-only";
import { getCurrentUserRoles, requireAuthenticatedSession } from "@/src/features/auth/session";
import { RESEARCH_SURVEY_VERSION } from "./domain";

export async function getResearchSurveyStatus() {
  const { supabase, user } = await requireAuthenticatedSession("/survey");
  const roles = await getCurrentUserRoles();
  const isAthlete = roles.includes("ATHLETE");
  if (!isAthlete) return { isAthlete: false, submitted: false };
  const { data, error } = await supabase.from("research_survey_responses").select("id").eq("athlete_user_id", user.id).eq("survey_version", RESEARCH_SURVEY_VERSION).maybeSingle();
  if (error) throw new Error("Unable to load survey status.");
  return { isAthlete: true, submitted: Boolean(data) };
}
