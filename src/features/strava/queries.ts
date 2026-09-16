import "server-only";

import { notFound } from "next/navigation";

import { requireAthleteSession } from "@/src/features/strava/repository";
import { createClient } from "@/src/lib/supabase/server";

export type StravaConnectionSummary = {
  id: string;
  athlete_id: string;
  strava_athlete_id: number;
  strava_display_name: string | null;
  granted_scopes: string[];
  connection_status: "CONNECTED" | "REAUTH_REQUIRED";
  connected_at: string;
  updated_at: string;
};

export async function isCurrentUserAthlete() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return false;
  const { data, error } = await supabase.rpc("has_role", { p_role_code: "ATHLETE" });
  if (error) throw new Error("Unable to determine Strava integration access.");
  return data;
}

export async function getStravaConnectionSummary(): Promise<StravaConnectionSummary | null> {
  if (!(await isCurrentUserAthlete())) notFound();
  const { supabase, user } = await requireAthleteSession();
  const { data, error } = await supabase
    .from("strava_connections")
    .select(
      "id, athlete_id, strava_athlete_id, strava_display_name, granted_scopes, connection_status, connected_at, updated_at",
    )
    .eq("athlete_id", user.id)
    .maybeSingle();

  if (error) throw new Error("Unable to load Strava connection status.");
  return data as StravaConnectionSummary | null;
}
