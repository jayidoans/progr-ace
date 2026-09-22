"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { disconnectAuthorizedStravaConnection } from "@/src/features/strava/disconnect";
import { StravaIntegrationError, stravaErrorRedirect } from "@/src/features/strava/errors";
import { requireAthleteSession } from "@/src/features/strava/repository";
import { synchronizeStravaActivities } from "@/src/features/strava/sync";

export async function disconnectStrava() {
  try {
    const { user } = await requireAthleteSession();
    await disconnectAuthorizedStravaConnection(user.id);
    revalidatePath("/dashboard/integrations/strava");
    redirect("/dashboard/integrations/strava?message=disconnected");
  } catch (error) {
    if (error instanceof StravaIntegrationError) {
      redirect(stravaErrorRedirect(error.code));
    }
    throw error;
  }
}

export async function syncStravaActivities(formData?: FormData) {
  const returnPath = formData?.get("returnTo") === "activities"
    ? "/dashboard/activities"
    : "/dashboard/integrations/strava";
  try {
    const result = await synchronizeStravaActivities();
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/activities");
    revalidatePath("/dashboard/integrations/strava");
    const params = new URLSearchParams({
      message: "synced",
      created: String(result.created_count),
      updated: String(result.updated_count),
      unchanged: String(result.unchanged_count),
      locked: String(result.locked_count),
    });
    if (returnPath === "/dashboard/activities") {
      params.set("message", "strava-synced");
    }
    redirect(`${returnPath}?${params.toString()}`);
  } catch (error) {
    if (error instanceof StravaIntegrationError) {
      if (returnPath === "/dashboard/activities") {
        redirect(`${returnPath}?error=${encodeURIComponent(error.code)}`);
      }
      redirect(stravaErrorRedirect(error.code));
    }
    throw error;
  }
}
