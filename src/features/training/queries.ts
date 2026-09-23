import "server-only";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getCurrentSession } from "@/src/features/auth/session";
import { createClient } from "@/src/lib/supabase/server";
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
  "id" | "athlete_id" | "target_finish_time_sec" | "status"
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
export type WeekWithPrescriptions = TrainingWeek & {
  prescriptions: PrescriptionWithComponents[];
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

const goalSelection = `
  id,
  athlete_id,
  target_finish_time_sec,
  status,
  athlete:profiles (id, full_name, email),
  race:races (id, name, event_date, distance_m, location)
`;

async function context() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=/dashboard/training");

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role:roles(name)")
    .eq("user_id", user.id);
  if (roleError) throw new Error("Unable to determine training access.");

  const roles = roleRows.map((row) => row.role.name);
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

export async function getTrainingProgram(programId: string) {
  const { supabase, user, roles, activeMode, isAuthor } = await context();
  const { data, error } = await supabase
    .from("training_programs")
    .select(
      `
        *,
        race_goal:athlete_race_goals (${goalSelection}),
        weeks:training_weeks (
          *,
          prescriptions:training_prescriptions (
            *,
            components:prescription_components (*)
          )
        )
      `,
    )
    .eq("id", programId)
    .maybeSingle();
  if (error) throw new Error("Unable to load the training program.");
  if (!data) return { program: null, scheduleWeeks: [], user, roles, activeMode, isAuthor: false, canEdit: false, canPlan: false };

  const program = data as TrainingProgramDetail;
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
  const claimByPrescription = new Map<string, PrescriptionWithComponents["claim"]>();
  if (prescriptionIds.length > 0) {
    const { data: claims, error: claimError } = await supabase
      .from("training_claims")
      .select("id, prescription_id, status, submitted_at, validation:claim_validations(result, automatic_result, evaluation_source, checks:validation_checks(check_type, target_value, actual_value, result, message))")
      .in("prescription_id", prescriptionIds);
    if (claimError) throw new Error("Unable to load training claim states.");
    claims.forEach((claim) => claimByPrescription.set(claim.prescription_id, claim));
  }
  program.weeks.forEach((week) =>
    week.prescriptions.forEach((prescription) => {
      prescription.claim = claimByPrescription.get(prescription.id) ?? null;
    }),
  );

  const scheduleWeeks = materializeProgramCalendar(
    program.start_date,
    program.end_date,
    program.weeks.map((week) => ({
      ...week,
      planning_status: week.planning_status as WeekPlanningStatus,
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
}

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
