import "server-only";

import { notFound } from "next/navigation";

import { requireAuthenticatedSession } from "@/src/features/auth/session";
import { requireAthleteSession } from "@/src/features/strava/repository";

export type StravaConnectionSummary = {
  id: string;
  athlete_id: string;
  strava_athlete_id: number;
  strava_display_name: string | null;
  granted_scopes: string[];
  connection_status: "CONNECTED" | "REAUTH_REQUIRED";
  activity_sync_status: "NEVER" | "SYNCING" | "SUCCEEDED" | "FAILED" | "RATE_LIMITED";
  last_sync_attempt_at: string | null;
  last_successful_sync_at: string | null;
  activity_sync_cursor_at: string | null;
  activity_sync_hour_started_at: string | null;
  activity_sync_attempt_count: number;
  last_sync_error_code: string | null;
  connected_at: string;
  updated_at: string;
};

export async function isCurrentUserAthlete() {
  const { supabase } = await requireAuthenticatedSession();
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
      "id, athlete_id, strava_athlete_id, strava_display_name, granted_scopes, connection_status, activity_sync_status, last_sync_attempt_at, last_successful_sync_at, activity_sync_cursor_at, activity_sync_hour_started_at, activity_sync_attempt_count, last_sync_error_code, connected_at, updated_at",
    )
    .eq("athlete_id", user.id)
    .maybeSingle();

  if (error) throw new Error("Unable to load Strava connection status.");
  return data as StravaConnectionSummary | null;
}

export async function getOptionalStravaConnectionSummary(): Promise<StravaConnectionSummary | null> {
  if (!(await isCurrentUserAthlete())) return null;
  const { supabase, user } = await requireAthleteSession();
  const { data, error } = await supabase
    .from("strava_connections")
    .select(
      "id, athlete_id, strava_athlete_id, strava_display_name, granted_scopes, connection_status, activity_sync_status, last_sync_attempt_at, last_successful_sync_at, activity_sync_cursor_at, activity_sync_hour_started_at, activity_sync_attempt_count, last_sync_error_code, connected_at, updated_at",
    )
    .eq("athlete_id", user.id)
    .maybeSingle();

  if (error) throw new Error("Unable to load Strava connection status.");
  return data as StravaConnectionSummary | null;
}
