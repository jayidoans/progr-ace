import "server-only";

import { notFound } from "next/navigation";

import { getCurrentUserRoles, requireAuthenticatedSession } from "@/src/features/auth/session";
import { utcDateString } from "@/src/features/validation/engine/compliance";
import { getRaceResultForGoal } from "@/src/features/race-results/queries";
import { buildCoachProgramReport, type ReportProgram } from "@/src/features/training-report/domain";

const reportSelection = `
  id, name, status, start_date, end_date, tracking_start_date, cancelled_at, created_by,
  race_goal:athlete_race_goals!inner (
    id, athlete_id, status, target_finish_time_sec, completed_at, completed_by,
    athlete:profiles!athlete_race_goals_athlete_id_fkey (id, full_name, email),
    race:races (id, name, event_date, distance_m)
  ),
  weeks:training_weeks (
    id, week_number, phase, planning_status, start_date, end_date,
    review:training_week_reviews (fulfillment_rating, coach_comment),
    prescriptions:training_prescriptions (
      id, scheduled_date, title, training_menu,
      components:prescription_components (id, target_distance_m, target_duration_sec, repetitions, distance_per_rep_m, sequence_order),
      claims:training_claims (
        id, status, submitted_at,
        validation:claim_validations (result, evaluation_source),
        evidence:claim_activities (activity:activities (id, distance_m, duration_sec, rpe, source, sport_type, started_at))
      )
    )
  )
`;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function getCoachTrainingProgramReport(programId: string) {
  if (!isUuid(programId)) notFound();
  const { supabase, user } = await requireAuthenticatedSession(`/dashboard/training/${programId}/report`);
  const roles = await getCurrentUserRoles();
  const isAdmin = roles.includes("ADMIN");
  if (!isAdmin && !roles.includes("COACH")) notFound();

  const { data, error } = await supabase
    .from("training_programs")
    .select(reportSelection as string)
    .eq("id", programId)
    .in("status", ["PUBLISHED", "CANCELLED", "ARCHIVED"])
    .maybeSingle();
  if (error) throw new Error("Unable to load the training program report.");
  const program = data as unknown as ReportProgram | null;
  if (!program || (!isAdmin && program.created_by !== user.id)) notFound();

  const { data: states, error: statesError } = await supabase.rpc(
    "get_authorized_program_claim_states",
    { p_program_ids: [programId] },
  );
  if (statesError) throw new Error("Unable to load authorized Claim states for the training program report.");
  const claimStates = new Map((states ?? []).map((row) => [row.prescription_id, row.claim_status]));
  const [report, raceResult] = await Promise.all([
    Promise.resolve(buildCoachProgramReport(program, utcDateString(), claimStates)),
    getRaceResultForGoal(program.race_goal.id),
  ]);
  return { report, raceResult };
}
