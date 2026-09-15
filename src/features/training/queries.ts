import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/src/lib/supabase/server";
import type { Json, Tables } from "@/src/types/database";

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
};
export type WeekWithPrescriptions = TrainingWeek & {
  prescriptions: PrescriptionWithComponents[];
};
export type TrainingProgramDetail = TrainingProgramWithGoal & { weeks: WeekWithPrescriptions[] };

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
  return { supabase, user, roles, isAuthor: roles.includes("COACH") || roles.includes("ADMIN") };
}

export async function getTrainingDashboardData() {
  const { supabase, roles, isAuthor } = await context();
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
    roles,
    isAuthor,
    programs: programsResult.data as TrainingProgramWithGoal[],
    raceGoals: goalsResult.data as ProgramRaceGoal[],
  };
}

export async function getTrainingProgram(programId: string) {
  const { supabase, user, roles, isAuthor } = await context();
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
  if (!data) return { program: null, user, roles, isAuthor: false, canEdit: false };

  const program = data as TrainingProgramDetail;
  program.weeks.sort((a, b) => a.week_number - b.week_number);
  program.weeks.forEach((week) => {
    week.prescriptions.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
    week.prescriptions.forEach((prescription) =>
      prescription.components.sort((a, b) => a.sequence_order - b.sequence_order),
    );
  });

  return {
    program,
    user,
    roles,
    isAuthor,
    canEdit: program.status === "DRAFT" && (roles.includes("ADMIN") || program.created_by === user.id),
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
