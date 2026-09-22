import "server-only";

import { revokeStravaToken } from "@/src/features/strava/api";
import { getStravaServerConfig } from "@/src/features/strava/config";
import { decryptToken, tokenEncryptionContext } from "@/src/features/strava/crypto";
import { runStravaDisconnectLifecycle } from "@/src/features/strava/disconnect-lifecycle";
import { StravaIntegrationError } from "@/src/features/strava/errors";
import { createAdminClient } from "@/src/lib/supabase/admin";

// Callers must establish either athlete ownership or actual ADMIN access first.
// Never expose this target-id core as a Server Action or browser endpoint.
export async function disconnectAuthorizedStravaConnection(athleteId: string) {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    throw new StravaIntegrationError("configuration", "Server-only Strava access is not configured.");
  }
  const { data, error } = await admin.rpc("get_strava_connection_credentials", {
    p_athlete_id: athleteId,
  });
  if (error) throw new StravaIntegrationError("storage_failed", "Strava credentials could not be loaded.");
  const credentials = data[0];
  if (!credentials) return;

  const config = getStravaServerConfig();
  await runStravaDisconnectLifecycle({
    decryptRefreshToken: () => decryptToken(
      { ciphertext: credentials.refresh_token_ciphertext, iv: credentials.refresh_token_iv },
      config.encryptionKey,
      tokenEncryptionContext(athleteId, "refresh"),
    ),
    revokeProvider: revokeStravaToken,
    removeLocalConnection: async () => {
      const { error: deleteError } = await admin.rpc("delete_strava_connection", {
        p_athlete_id: athleteId,
      });
      if (deleteError) throw new StravaIntegrationError("storage_failed", "Strava connection could not be removed.");
    },
  });
}
