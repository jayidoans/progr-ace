"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { revokeStravaToken } from "@/src/features/strava/api";
import { getStravaServerConfig } from "@/src/features/strava/config";
import { decryptToken, tokenEncryptionContext } from "@/src/features/strava/crypto";
import { StravaIntegrationError, stravaErrorRedirect } from "@/src/features/strava/errors";
import {
  getEncryptedStravaCredentials,
  removeStravaConnection,
} from "@/src/features/strava/repository";
import { synchronizeStravaActivities } from "@/src/features/strava/sync";

export async function disconnectStrava() {
  try {
    const config = getStravaServerConfig();
    const { credentials, user } = await getEncryptedStravaCredentials();
    if (!credentials) {
      redirect("/dashboard/integrations/strava?message=disconnected");
    }

    const refreshToken = await decryptToken(
      {
        ciphertext: credentials.refresh_token_ciphertext,
        iv: credentials.refresh_token_iv,
      },
      config.encryptionKey,
      tokenEncryptionContext(user.id, "refresh"),
    );
    await revokeStravaToken(refreshToken);
    await removeStravaConnection();
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
