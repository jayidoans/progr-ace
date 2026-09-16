import "server-only";

import {
  STRAVA_REFRESH_WINDOW_SECONDS,
} from "@/src/features/strava/constants";
import { getStravaServerConfig } from "@/src/features/strava/config";
import {
  decryptToken,
  encryptToken,
  tokenEncryptionContext,
} from "@/src/features/strava/crypto";
import { refreshStravaToken } from "@/src/features/strava/api";
import { StravaIntegrationError } from "@/src/features/strava/errors";
import {
  resolveValidAccessToken,
  TokenRefreshResolutionError,
} from "@/src/features/strava/refresh-core";
import {
  claimRefreshLease,
  completeRefreshLease,
  releaseRefreshLease,
} from "@/src/features/strava/repository";

export async function getValidStravaAccessToken() {
  const config = getStravaServerConfig();
  let athleteId = "";

  try {
    return await resolveValidAccessToken({
      claim: async (refreshBefore, lockToken) => {
        const result = await claimRefreshLease(refreshBefore, lockToken);
        athleteId = result.user.id;
        return result.lease;
      },
      decryptAccess: async (lease) => {
        if (!lease.access_token_ciphertext || !lease.access_token_iv || !athleteId) {
          throw new TokenRefreshResolutionError("invalid");
        }
        return decryptToken(
          { ciphertext: lease.access_token_ciphertext, iv: lease.access_token_iv },
          config.encryptionKey,
          tokenEncryptionContext(athleteId, "access"),
        );
      },
      decryptRefresh: async (lease) => {
        if (!lease.refresh_token_ciphertext || !lease.refresh_token_iv || !athleteId) {
          throw new TokenRefreshResolutionError("invalid");
        }
        return decryptToken(
          { ciphertext: lease.refresh_token_ciphertext, iv: lease.refresh_token_iv },
          config.encryptionKey,
          tokenEncryptionContext(athleteId, "refresh"),
        );
      },
      refresh: async (refreshToken) => {
        const refreshed = await refreshStravaToken(refreshToken);
        return {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          expiresAt: new Date(refreshed.expires_at * 1000),
        };
      },
      persist: async (lockToken, tokenVersion, refreshed) => {
        const [accessToken, refreshToken] = await Promise.all([
          encryptToken(
            refreshed.accessToken,
            config.encryptionKey,
            tokenEncryptionContext(athleteId, "access"),
          ),
          encryptToken(
            refreshed.refreshToken,
            config.encryptionKey,
            tokenEncryptionContext(athleteId, "refresh"),
          ),
        ]);
        return completeRefreshLease({
          lockToken,
          tokenVersion,
          accessToken,
          refreshToken,
          expiresAt: refreshed.expiresAt,
        });
      },
      release: releaseRefreshLease,
      newLockToken: () => crypto.randomUUID(),
      wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
      now: Date.now,
      refreshWindowSeconds: STRAVA_REFRESH_WINDOW_SECONDS,
    });
  } catch (error) {
    if (error instanceof StravaIntegrationError) throw error;
    if (error instanceof TokenRefreshResolutionError) {
      if (error.code === "missing") {
        throw new StravaIntegrationError("authentication", "No Strava connection is available.");
      }
      if (error.code === "busy") {
        throw new StravaIntegrationError("refresh_busy", "Strava credentials are currently being refreshed.");
      }
      throw new StravaIntegrationError("storage_failed", "Stored Strava credentials are incomplete.");
    }
    throw new StravaIntegrationError("refresh_failed", "Strava credentials could not be refreshed.");
  }
}
