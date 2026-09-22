import "server-only";

import { StravaIntegrationError } from "@/src/features/strava/errors";
import { requireAthleteSession } from "@/src/features/strava/repository";

export async function isCurrentAthleteStravaAllowed() {
  const { supabase } = await requireAthleteSession();
  const { data, error } = await supabase.rpc("current_user_strava_permission");
  if (error) throw new StravaIntegrationError("storage_failed", "Strava access could not be checked.");
  return data === true;
}

export async function requireStravaPermission() {
  if (!(await isCurrentAthleteStravaAllowed())) {
    throw new StravaIntegrationError("permission_denied", "Strava is not available for this account.");
  }
}
