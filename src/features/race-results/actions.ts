"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/src/lib/supabase/server";
import type { RaceResultStatus } from "@/src/features/race-results/domain";

type RaceResultInput = {
  status: RaceResultStatus;
  finishTimeSec?: number | null;
  notes?: string | null;
};

async function client() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication is required");
  return supabase;
}

export async function createRaceResult(goalId: string, input: RaceResultInput) {
  const supabase = await client();
  const { data, error } = await supabase.rpc("create_race_result", {
    p_athlete_race_goal_id: goalId,
    p_status: input.status,
    p_finish_time_sec: input.finishTimeSec ?? null,
    p_notes: input.notes ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/race-goals/${goalId}`);
  return data;
}

export async function updateRaceResult(resultId: string, input: RaceResultInput) {
  const supabase = await client();
  const { data, error } = await supabase.rpc("update_race_result", {
    p_race_result_id: resultId,
    p_status: input.status,
    p_finish_time_sec: input.finishTimeSec ?? null,
    p_notes: input.notes ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/race-goals");
  return data;
}
