import "server-only";

import {
  activitySyncAfterEpochSeconds,
  normalizeStravaActivity,
} from "@/src/features/strava/activity-sync";
import {
  fetchAllStravaActivities,
  StravaActivityPageLimitError,
} from "@/src/features/strava/activity-sync-core";
import {
  fetchStravaActivitiesPage,
  StravaActivityTransportError,
} from "@/src/features/strava/activity-transport";
import { StravaIntegrationError } from "@/src/features/strava/errors";
import { getValidStravaAccessToken } from "@/src/features/strava/refresh";
import {
  claimActivitySyncLease,
  completeActivitySync,
  failActivitySync,
} from "@/src/features/strava/repository";

async function safelyFailSync(input: Parameters<typeof failActivitySync>[0]) {
  await failActivitySync(input).catch(() => undefined);
}

export async function synchronizeStravaActivities() {
  const syncStartedAt = new Date();
  const lockToken = crypto.randomUUID();
  const { lease } = await claimActivitySyncLease(lockToken);

  if (lease.sync_state === "BUSY") {
    throw new StravaIntegrationError("sync_busy", "A Strava synchronization is already running.");
  }
  if (lease.sync_state === "MISSING" || lease.sync_state === "REAUTH_REQUIRED") {
    throw new StravaIntegrationError("reauth_required", "Reconnect Strava before synchronizing.");
  }
  if (lease.sync_state !== "ACQUIRED") {
    throw new StravaIntegrationError("activity_sync_failed", "Strava synchronization could not start.");
  }

  try {
    const accessToken = await getValidStravaAccessToken();
    const after = activitySyncAfterEpochSeconds({
      syncStartedAt,
      cursor: lease.activity_sync_cursor_at,
    });
    const activities = await fetchAllStravaActivities({
      after,
      fetchPage: (page, perPage) =>
        fetchStravaActivitiesPage({ accessToken, after, page, perPage }),
    });
    return await completeActivitySync({
      lockToken,
      syncStartedAt,
      activities: activities.map(normalizeStravaActivity),
    });
  } catch (error) {
    if (error instanceof StravaActivityTransportError) {
      if (error.code === "authorization") {
        await safelyFailSync({
          lockToken,
          status: "FAILED",
          errorCode: "authorization",
          requireReauth: true,
        });
        throw new StravaIntegrationError("reauth_required", "Reconnect Strava before synchronizing.");
      }
      if (error.code === "rate_limited") {
        await safelyFailSync({ lockToken, status: "RATE_LIMITED", errorCode: "rate_limited" });
        throw new StravaIntegrationError("rate_limited", "Strava rate limit reached.");
      }
      await safelyFailSync({ lockToken, status: "FAILED", errorCode: error.code });
      throw new StravaIntegrationError("activity_sync_failed", "Strava synchronization failed.");
    }
    if (error instanceof StravaActivityPageLimitError) {
      await safelyFailSync({ lockToken, status: "FAILED", errorCode: "page_limit" });
      throw new StravaIntegrationError("activity_sync_failed", "Strava synchronization exceeded its safe page limit.");
    }
    await safelyFailSync({ lockToken, status: "FAILED", errorCode: "sync_failed" });
    if (error instanceof StravaIntegrationError) throw error;
    throw new StravaIntegrationError("activity_sync_failed", "Strava synchronization failed.");
  }
}
