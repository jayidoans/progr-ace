import "server-only";

import { notFound } from "next/navigation";

import { requireAuthenticatedSession } from "@/src/features/auth/session";
import { utcDateString } from "@/src/features/validation/engine/compliance";
import { canReadProgramRunningAnalytics } from "@/src/features/running-analytics/authorization";
import {
  buildProgramRunningAnalytics,
  type ProgramRunningAnalytics,
  type RunningAnalyticsProgramSource,
} from "@/src/features/running-analytics/domain";

const programIdentitySelection = `
  id,
  status,
  created_by,
  race_goal:athlete_race_goals!inner (athlete_id)
`;

const programAnalyticsSelection = `
  id,
  name,
  status,
  start_date,
  end_date,
  created_by,
  race_goal:athlete_race_goals!inner (
    id,
    athlete_id,
    status,
    athlete:profiles!athlete_race_goals_athlete_id_fkey (id, full_name, email),
    race:races (id, name, event_date)
  ),
  weeks:training_weeks (
    id,
    week_number,
    phase,
    planning_status,
    start_date,
    end_date,
    prescriptions:training_prescriptions (
      id,
      scheduled_date,
      training_menu,
      title,
      description,
      components:prescription_components (
        id,
        component_type,
        sequence_order,
        target_distance_m,
        target_duration_sec,
        repetitions,
        distance_per_rep_m,
        recovery_duration_sec,
        target_pace_min_sec_per_km,
        target_pace_max_sec_per_km,
        instruction
      ),
      claims:training_claims (
        id,
        status,
        submitted_at,
        validation:claim_validations (result, evaluation_source),
        evidence:claim_activities (
          activity:activities (
            id,
            name,
            source,
            sport_type,
            started_at,
            distance_m,
            duration_sec,
            average_hr_bpm,
            rpe
          )
        )
      )
    )
  )
`;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function getProgramRunningAnalytics(
  programId: string,
  today = utcDateString(),
): Promise<ProgramRunningAnalytics> {
  if (!isUuid(programId)) notFound();
  const { supabase, user } = await requireAuthenticatedSession(
    `/dashboard/training/${programId}`,
  );
  const [rolesResult, identityResult] = await Promise.all([
    supabase.from("user_roles").select("role:roles(name)").eq("user_id", user.id),
    supabase
      .from("training_programs")
      .select(programIdentitySelection)
      .eq("id", programId)
      .maybeSingle(),
  ]);
  if (rolesResult.error || identityResult.error || !identityResult.data) notFound();
  const identity = identityResult.data as unknown as {
    id: string;
    status: string;
    created_by: string;
    race_goal: { athlete_id: string };
  };
  const roles = rolesResult.data.map((row) => row.role.name);
  if (!canReadProgramRunningAnalytics({
    userId: user.id,
    roles,
    programStatus: identity.status,
    programCreatedBy: identity.created_by,
    athleteId: identity.race_goal.athlete_id,
  })) notFound();

  const { data, error } = await supabase
    .from("training_programs")
    .select(programAnalyticsSelection as string)
    .eq("id", programId)
    .maybeSingle();
  if (error || !data) notFound();

  const claimStates = new Map<string, string | null>();
  if (roles.includes("ADMIN") || (roles.includes("COACH") && identity.created_by === user.id)) {
    const { data: states, error: statesError } = await supabase.rpc(
      "get_authorized_program_claim_states",
      { p_program_ids: [programId] },
    );
    if (statesError) throw new Error("Unable to load authorized Claim states for analytics.");
    states.forEach((row) => claimStates.set(row.prescription_id, row.claim_status));
  }

  return buildProgramRunningAnalytics(
    data as unknown as RunningAnalyticsProgramSource,
    today,
    claimStates,
  );
}
