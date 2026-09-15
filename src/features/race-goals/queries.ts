import "server-only";

import { createClient } from "@/src/lib/supabase/server";
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

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication is required.");
  }

  return { supabase, user };
}

export async function getActiveRaceGoal(): Promise<RaceGoalWithRace | null> {
  const { supabase, user } = await authenticatedClient();
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
  const { supabase, user } = await authenticatedClient();

  const [racesResult, activeResult, historyResult] = await Promise.all([
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
  ]);

  if (racesResult.error || activeResult.error || historyResult.error) {
    throw new Error("Unable to load race goal information.");
  }

  return {
    races: racesResult.data,
    activeGoal: activeResult.data,
    history: historyResult.data,
  };
}
