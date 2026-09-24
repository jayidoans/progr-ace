import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { getCurrentSession, getCurrentUserRoles, requireAuthenticatedSession } from "@/src/features/auth/session";
import type { Json, Tables } from "@/src/types/database";
import { ACTIVE_MODE_STORAGE_KEY, resolveActiveMode } from "@/src/features/navigation/active-mode";
import {
  materializeProgramCalendar,
  type MaterializedScheduleWeek,
  type WeekPlanningStatus,
} from "@/src/features/training/weekly-planning";

export type TrainingProgram = Tables<"training_programs">;
export type TrainingWeek = Tables<"training_weeks">;
export type TrainingPrescription = Tables<"training_prescriptions">;
export type PrescriptionComponent = Tables<"prescription_components">;

export type ProgramRaceGoal = Pick<
  Tables<"athlete_race_goals">,
  "id" | "athlete_id" | "target_finish_time_sec" | "status" | "completed_at" | "completed_by"
> & {
  athlete: Pick<Tables<"profiles">, "id" | "full_name" | "email">;
  race: Pick<Tables<"races">, "id" | "name" | "event_date" | "distance_m" | "location">;
};

export type TrainingProgramWithGoal = TrainingProgram & { race_goal: ProgramRaceGoal };
export type PrescriptionWithComponents = TrainingPrescription & {
  components: PrescriptionComponent[];
  claim: {
    id: string;
    status: string;
    submitted_at: string | null;
    validation: {
      result: string;
      automatic_result: string;
      evaluation_source: string;
      checks: Pick<
        Tables<"validation_checks">,
        "check_type" | "target_value" | "actual_value" | "result" | "message"
      >[];
    } | null;
  } | null;
};
type EvaluationEvidence = {
  activity: Pick<
    Tables<"activities">,
    "id" | "distance_m" | "duration_sec" | "rpe" | "source" | "sport_type" | "started_at"
  >;
};
type PrescriptionWithEvaluationEvidence = Omit<PrescriptionWithComponents, "claim"> & {
  claim: (NonNullable<PrescriptionWithComponents["claim"]> & {
    evidence: EvaluationEvidence[];
  }) | null;
};
export type WeekWithPrescriptions = TrainingWeek & {
  prescriptions: PrescriptionWithEvaluationEvidence[];
};
export type TrainingScheduleWeek = MaterializedScheduleWeek<PrescriptionWithComponents>;
export type TrainingProgramDetail = TrainingProgramWithGoal & { weeks: WeekWithPrescriptions[] };
export type HomepageTrainingProgram = Pick<
  TrainingProgram,
  "id" | "name" | "start_date" | "end_date" | "status"
> & {
  race_goal: {
    race: Pick<Tables<"races">, "name" | "distance_m">;
  };
};

export type CopyableTrainingProgram = {
  id: string;
  name: string;
  status: string;
  created_by: string;
  start_date: string;
  end_date: string;
  race_goal: {
    id: string;
    athlete_id: string;
    status: string;
    athlete: Pick<Tables<"profiles">, "id" | "full_name" | "email">;
    race: Pick<Tables<"races">, "id" | "name" | "event_date" | "distance_m">;
  };
  weeks: Array<{ id: string; prescriptions: Array<{ id: string }> }>;
};

const goalSelection = `
  id,
  athlete_id,
  target_finish_time_sec,
  status,
  completed_at,
  completed_by,
  athlete:profiles!athlete_race_goals_athlete_id_fkey (id, full_name, email),
  race:races (id, name, event_date, distance_m, location)
`;

const trainingProgramSelection = `
  id,
  race_goal_id,
  name,
  description,
  start_date,
  end_date,
  status,
  created_by,
  tracking_start_date,
  race_goal:athlete_race_goals (${goalSelection}),
  weeks:training_weeks (
    id,
    training_program_id,
    week_number,
    phase,
    planning_status,
    start_date,
    end_date,
    prescriptions:training_prescriptions (
      id,
      training_week_id,
      training_menu,
      scheduled_date,
      title,
      description,
      components:prescription_components (
        id,
        prescription_id,
        sequence_order,
        component_type,
        target_distance_m,
        target_duration_sec,
        repetitions,
        distance_per_rep_m,
        recovery_duration_sec,
        target_pace_min_sec_per_km,
        target_pace_max_sec_per_km,
        instruction
      )
    )
  )
`;

async function context() {
  const { supabase, user } = await requireAuthenticatedSession("/dashboard/training");
  const roles = await getCurrentUserRoles();
  const activeMode = resolveActiveMode(
    roles,
    (await cookies()).get(ACTIVE_MODE_STORAGE_KEY)?.value,
  );
  return {
    supabase,
    user,
    userId: user.id,
    roles,
    activeMode,
    isAuthor: activeMode !== "ATHLETE" && (roles.includes("COACH") || roles.includes("ADMIN")),
  };
}

export async function getTrainingDashboardData() {
  const { supabase, userId, roles, isAuthor } = await context();
  const programsQuery = supabase
    .from("training_programs")
    .select(`*, race_goal:athlete_race_goals (${goalSelection})`)
    .order("start_date", { ascending: false });
  const raceGoalsQuery = isAuthor
    ? supabase
        .from("athlete_race_goals")
        .select(goalSelection)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
    : Promise.resolve({ data: [], error: null });
  const [programsResult, goalsResult] = await Promise.all([programsQuery, raceGoalsQuery]);
  if (programsResult.error || goalsResult.error) throw new Error("Unable to load training programs.");

  return {
    userId,
    roles,
    isAuthor,
    programs: programsResult.data as TrainingProgramWithGoal[],
    raceGoals: goalsResult.data as ProgramRaceGoal[],
  };
}

export async function getCopyableTrainingPrograms() {
  const { supabase, userId, roles, isAuthor } = await context();
  if (!isAuthor) return [] as CopyableTrainingProgram[];

  const { data, error } = await supabase
    .from("training_programs")
    .select(`
      id, name, status, created_by, start_date, end_date,
      race_goal:athlete_race_goals (
        id, athlete_id, status,
        athlete:profiles!athlete_race_goals_athlete_id_fkey (id, full_name, email),
        race:races (id, name, event_date, distance_m)
      ),
      weeks:training_weeks (id, prescriptions:training_prescriptions (id))
    `)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load copyable training programs.");

  const visible = roles.includes("ADMIN")
    ? data
    : data.filter((program) => program.created_by === userId);
  return visible as unknown as CopyableTrainingProgram[];
}

export async function getHomepageTrainingPrograms(): Promise<HomepageTrainingProgram[]> {
  const { supabase, user, authError } = await getCurrentSession();
  if (authError || !user) return [];

  const { data, error } = await supabase
    .from("training_programs")
    .select(`
      id,
      name,
      start_date,
      end_date,
      status,
      race_goal:athlete_race_goals (
        race:races (name, distance_m)
      )
    `)
    .eq("status", "PUBLISHED")
    .order("start_date", { ascending: false })
    .limit(6);
  if (error) throw new Error("Unable to load available training programs.");
  return data as HomepageTrainingProgram[];
}

export const getTrainingProgram = cache(async (programId: string) => {
  const { supabase, user, roles, activeMode, isAuthor } = await context();
  const { data, error } = await supabase
    .from("training_programs")
    .select(trainingProgramSelection)
    .eq("id", programId)
    .maybeSingle();
  if (error) throw new Error("Unable to load the training program.");
  if (!data) return { program: null, scheduleWeeks: [], user, roles, activeMode, isAuthor: false, canEdit: false, canPlan: false };

  const program = data as unknown as TrainingProgramDetail;
  program.weeks.sort((a, b) => a.week_number - b.week_number);
  program.weeks.forEach((week) => {
    week.prescriptions.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
    week.prescriptions.forEach((prescription) =>
      prescription.components.sort((a, b) => a.sequence_order - b.sequence_order),
    );
  });

  const prescriptionIds = program.weeks.flatMap((week) =>
    week.prescriptions.map((prescription) => prescription.id),
  );
  const claimByPrescription = new Map<string, PrescriptionWithEvaluationEvidence["claim"]>();
  if (prescriptionIds.length > 0) {
    const { data: claims, error: claimError } = await supabase
      .from("training_claims")
      .select("id, prescription_id, status, submitted_at, validation:claim_validations(result, automatic_result, evaluation_source, checks:validation_checks(check_type, target_value, actual_value, result, message)), evidence:claim_activities(activity:activities(id, distance_m, duration_sec, rpe, source, sport_type, started_at))")
      .in("prescription_id", prescriptionIds);
    if (claimError) throw new Error("Unable to load training claim states.");
    claims.forEach((claim) => claimByPrescription.set(claim.prescription_id, claim));
  }
  program.weeks.forEach((week) =>
    week.prescriptions.forEach((prescription) => {
      prescription.claim = claimByPrescription.get(prescription.id) ?? null;
    }),
  );

  const scheduleWeeks = materializeProgramCalendar<PrescriptionWithComponents>(
    program.start_date,
    program.end_date,
    program.weeks.map((week) => ({
      ...week,
      planning_status: week.planning_status as WeekPlanningStatus,
      prescriptions: week.prescriptions.map((prescription) => ({
        ...prescription,
        claim: prescription.claim ? {
          id: prescription.claim.id,
          status: prescription.claim.status,
          submitted_at: prescription.claim.submitted_at,
          validation: prescription.claim.validation,
        } : null,
      })),
    })),
  );

  return {
    program,
    scheduleWeeks,
    user,
    roles,
    activeMode,
    isAuthor,
    canEdit: program.status === "DRAFT" && (roles.includes("ADMIN") || program.created_by === user.id),
    canPlan:
      program.status === "PUBLISHED"
      && activeMode !== "ATHLETE"
      && (roles.includes("ADMIN") || (roles.includes("COACH") && program.created_by === user.id)),
    canClaim: program.status === "PUBLISHED" && program.race_goal.athlete_id === user.id,
  };
});

export async function getTrainingImportPreview(previewId: string) {
  const { supabase, isAuthor } = await context();
  if (!isAuthor) return null;
  const { data, error } = await supabase
    .from("training_import_previews")
    .select("id, race_goal_id, template_version, payload, warnings, imported_program_id, expires_at")
    .eq("id", previewId)
    .maybeSingle();
  if (error) throw new Error("Unable to load the training import preview.");
  return data as
    | {
        id: string;
        race_goal_id: string;
        template_version: number;
        payload: Json;
        warnings: Json;
        imported_program_id: string | null;
        expires_at: string;
      }
    | null;
}
