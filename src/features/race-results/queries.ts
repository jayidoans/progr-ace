import "server-only";

import { requireAuthenticatedSession } from "@/src/features/auth/session";
import type { RaceResultContext } from "@/src/features/race-results/domain";

const resultSelection = `
  id,
  athlete_race_goal_id,
  status,
  finish_time_sec,
  result_source,
  notes,
  recorded_by,
  created_at,
  updated_at,
  race_goal:athlete_race_goals!inner (
    id,
    athlete_id,
    status,
    target_finish_time_sec,
    race:races!inner (name, event_date, distance_m)
  )
`;

function mapRaceResult(row: {
  id: string; athlete_race_goal_id: string; status: RaceResultContext["status"];
  finish_time_sec: number | null; result_source: "MANUAL"; notes: string | null;
  recorded_by: string; created_at: string; updated_at: string;
  race_goal: { athlete_id: string; status: string; target_finish_time_sec: number | null; race: { name: string; event_date: string; distance_m: number } };
}): RaceResultContext {
  return {
    id: row.id,
    athleteRaceGoalId: row.athlete_race_goal_id,
    status: row.status,
    finishTimeSec: row.finish_time_sec,
    resultSource: row.result_source,
    notes: row.notes,
    recordedBy: row.recorded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    raceGoalStatus: row.race_goal.status,
    raceName: row.race_goal.race.name,
    raceDate: row.race_goal.race.event_date,
    raceDistanceM: row.race_goal.race.distance_m,
    targetFinishTimeSec: row.race_goal.target_finish_time_sec,
    athleteId: row.race_goal.athlete_id,
  };
}

export async function getRaceResultsForGoals(goalIds: string[]): Promise<RaceResultContext[]> {
  if (goalIds.length === 0) return [];
  const { supabase } = await requireAuthenticatedSession();
  const { data, error } = await supabase
    .from("race_results")
    .select(resultSelection)
    .in("athlete_race_goal_id", goalIds);
  if (error) throw new Error("Unable to load the race result.");
  return (data ?? []).map((row) => mapRaceResult(row as unknown as Parameters<typeof mapRaceResult>[0]));
}

export async function getRaceResultForGoal(goalId: string): Promise<RaceResultContext | null> {
  const results = await getRaceResultsForGoals([goalId]);
  return results[0] ?? null;
}
