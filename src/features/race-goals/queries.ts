import "server-only";

import { requireAuthenticatedSession } from "@/src/features/auth/session";
import type { Tables } from "@/src/types/database";

export type Race = Tables<"races">;
export type RaceGoal = Tables<"athlete_race_goals">;
export type RaceGoalWithRace = RaceGoal & { race: Race };

const goalWithRaceSelection = `
  id,
  athlete_id,
  race_id,
  target_finish_time_sec,
  status,
  notes,
  completed_at,
  completed_by,
  created_at,
  updated_at,
  race:races (
    id,
    name,
    event_date,
    location,
    distance_m,
    created_by,
    created_at,
    updated_at
  )
`;

export async function getActiveRaceGoal(): Promise<RaceGoalWithRace | null> {
  const { supabase, user } = await requireAuthenticatedSession();
  const { data, error } = await supabase
    .from("athlete_race_goals")
    .select(goalWithRaceSelection)
    .eq("athlete_id", user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load the active race goal.");
  }

  return data;
}

export async function getRaceGoalPageData() {
  const { supabase, user } = await requireAuthenticatedSession();

  const [racesResult, activeResult, historyResult, adminRoleResult, coachRoleResult] = await Promise.all([
    supabase.from("races").select("*").order("event_date", { ascending: true }),
    supabase
      .from("athlete_race_goals")
      .select(goalWithRaceSelection)
      .eq("athlete_id", user.id)
      .eq("status", "ACTIVE")
      .maybeSingle(),
    supabase
      .from("athlete_race_goals")
      .select(goalWithRaceSelection)
      .eq("athlete_id", user.id)
      .in("status", ["COMPLETED", "CANCELLED"])
      .order("updated_at", { ascending: false }),
    supabase.rpc("has_role", { p_role_code: "ADMIN" }),
    supabase.rpc("has_role", { p_role_code: "COACH" }),
  ]);

  if (
    racesResult.error
    || activeResult.error
    || historyResult.error
    || adminRoleResult.error
    || coachRoleResult.error
  ) {
    throw new Error("Unable to load race goal information.");
  }

  return {
    races: racesResult.data,
    activeGoal: activeResult.data,
    history: historyResult.data,
    canManageRaces: Boolean(adminRoleResult.data || coachRoleResult.data),
  };
}
