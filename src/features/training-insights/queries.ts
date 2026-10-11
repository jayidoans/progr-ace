import "server-only";

import { notFound } from "next/navigation";

import { getCurrentUserRoles, requireAuthenticatedSession } from "@/src/features/auth/session";
import { utcDateString } from "@/src/features/validation/engine/compliance";
import { utcCalendarWeek } from "@/src/features/evaluation/analytics";

import { canReadCoachTrainingInsights, canReadTrainingInsightsProgram } from "./authorization";
import {
  fourWeekWindowStart,
  projectCoachTrainingInsights,
  projectProgramTrainingInsights,
  type TrainingInsightsProgram,
} from "./projections";
import type { CoachTrainingInsightsSummary, ProgramTrainingInsights } from "./types";

const MAX_COACH_PROGRAMS = 24;
const WEEKS_PER_PROGRAM = 4;

const programSelection = `
  id,
  name,
  status,
  start_date,
  end_date,
  tracking_start_date,
  cancelled_at,
  created_by,
  race_goal:athlete_race_goals!inner (
    id,
    athlete_id,
    status,
    target_finish_time_sec,
    completed_at,
    completed_by,
    athlete:profiles!athlete_race_goals_athlete_id_fkey (id, full_name, email),
    race:races (id, name, event_date, distance_m)
  )
`;

const weekSelection = `
  id,
  training_program_id,
  week_number,
  phase,
  planning_status,
  start_date,
  end_date,
  prescriptions:training_prescriptions (
    id,
    scheduled_date,
    title,
    training_menu,
    components:prescription_components (
      id,
      sequence_order,
      target_distance_m,
      target_duration_sec,
      repetitions,
      distance_per_rep_m
    ),
    claims:training_claims (
      id,
      status,
      submitted_at,
      validation:claim_validations (result, evaluation_source),
      evidence:claim_activities (
        activity:activities (id, distance_m, duration_sec, rpe, source, sport_type, started_at)
      )
    )
  )
`;

type ProgramIdentity = Pick<TrainingInsightsProgram, "id" | "status" | "created_by"> & {
  race_goal: Pick<TrainingInsightsProgram["race_goal"], "athlete_id">;
};

type BoundedWeek = TrainingInsightsProgram["weeks"][number] & {
  training_program_id: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function sortBoundedWeeks(program: TrainingInsightsProgram) {
  program.weeks.sort((left, right) => left.start_date.localeCompare(right.start_date) || left.id.localeCompare(right.id));
  program.weeks.forEach((week) => {
    week.prescriptions.sort((left, right) =>
      left.scheduled_date.localeCompare(right.scheduled_date) || left.id.localeCompare(right.id),
    );
    week.prescriptions.forEach((prescription) => {
      prescription.components.sort((left, right) => left.sequence_order - right.sequence_order);
    });
  });
}

function canReadInsights(
  identity: ProgramIdentity,
  userId: string,
  roles: string[],
) {
  return canReadTrainingInsightsProgram({
    userId,
    roles,
    programStatus: identity.status,
    programCreatedBy: identity.created_by,
    athleteId: identity.race_goal.athlete_id,
  });
}

async function loadBoundedWeeks(
  supabase: Awaited<ReturnType<typeof requireAuthenticatedSession>>["supabase"],
  programIds: string[],
  today: string,
) {
  if (programIds.length === 0) return [] as BoundedWeek[];
  const { data, error } = await supabase
    .from("training_weeks")
    .select(weekSelection)
    .in("training_program_id", programIds)
    .eq("planning_status", "PUBLISHED")
    .gte("start_date", fourWeekWindowStart(today))
    .lte("start_date", utcCalendarWeek(today).startDate)
    .order("start_date", { ascending: false })
    .limit(programIds.length * WEEKS_PER_PROGRAM);
  if (error) throw new Error("Unable to load bounded training insight weeks.");
  return (data ?? []) as unknown as BoundedWeek[];
}

function attachBoundedWeeks(
  programs: TrainingInsightsProgram[],
  weeks: BoundedWeek[],
) {
  const weeksByProgram = new Map<string, BoundedWeek[]>();
  weeks.forEach((week) => {
    const existing = weeksByProgram.get(week.training_program_id) ?? [];
    existing.push(week);
    weeksByProgram.set(week.training_program_id, existing);
  });
  return programs.map((program) => {
    const bounded = {
      ...program,
      weeks: (weeksByProgram.get(program.id) ?? [])
        .sort((left, right) => right.start_date.localeCompare(left.start_date) || right.id.localeCompare(left.id))
        .slice(0, WEEKS_PER_PROGRAM),
    } as TrainingInsightsProgram;
    sortBoundedWeeks(bounded);
    return bounded;
  });
}

/**
 * Returns only the current UTC calendar week and the preceding three published
 * calendar weeks. RLS remains in force and a second explicit ownership check
 * protects callers from cross-account IDs.
 */
export async function getProgramTrainingInsights(
  programId: string,
  today = utcDateString(),
): Promise<ProgramTrainingInsights> {
  if (!isUuid(programId)) notFound();
  const [{ supabase, user }, roles] = await Promise.all([
    requireAuthenticatedSession(`/dashboard/training/${programId}`),
    getCurrentUserRoles(),
  ]);
  const { data, error } = await supabase
    .from("training_programs")
    .select(programSelection)
    .eq("id", programId)
    .maybeSingle();
  if (error) throw new Error("Unable to load training insight program.");
  const program = data as unknown as TrainingInsightsProgram | null;
  if (!program || !canReadInsights(program, user.id, roles)) notFound();

  const weeks = await loadBoundedWeeks(supabase, [programId], today);
  const [boundedProgram] = attachBoundedWeeks([program], weeks);
  return projectProgramTrainingInsights(boundedProgram, today);
}

export type CoachTrainingInsightsProjection = {
  summaries: CoachTrainingInsightsSummary[];
  hasMore: boolean;
  timezone: "UTC";
};

/**
 * Coach/Admin monitoring is capped at 24 programs plus one sentinel record.
 * The single week query is bounded at four calendar weeks for each returned
 * program, so this endpoint has no per-athlete or per-program request loop.
 */
export async function getCoachTrainingInsights(
  today = utcDateString(),
): Promise<CoachTrainingInsightsProjection> {
  const [{ supabase, user }, roles] = await Promise.all([
    requireAuthenticatedSession("/dashboard/coaching/athletes"),
    getCurrentUserRoles(),
  ]);
  const isAdmin = roles.includes("ADMIN");
  if (!canReadCoachTrainingInsights(roles)) notFound();

  let query = supabase
    .from("training_programs")
    .select(programSelection)
    .in("status", ["PUBLISHED", "CANCELLED"])
    .order("start_date", { ascending: false })
    .limit(MAX_COACH_PROGRAMS + 1);
  if (!isAdmin) query = query.eq("created_by", user.id);
  const { data, error } = await query;
  if (error) throw new Error("Unable to load coach training insight programs.");

  const visible = (data ?? []) as unknown as TrainingInsightsProgram[];
  const hasMore = visible.length > MAX_COACH_PROGRAMS;
  const programs = visible.slice(0, MAX_COACH_PROGRAMS);
  if (programs.some((program) => !canReadInsights(program, user.id, roles))) notFound();

  const weeks = await loadBoundedWeeks(supabase, programs.map((program) => program.id), today);
  return {
    summaries: projectCoachTrainingInsights(attachBoundedWeeks(programs, weeks), today),
    hasMore,
    timezone: "UTC",
  };
}

export const TRAINING_INSIGHTS_BOUNDS = {
  maxCoachPrograms: MAX_COACH_PROGRAMS,
  weeksPerProgram: WEEKS_PER_PROGRAM,
} as const;
