import "server-only";

import { getCurrentSession } from "@/src/features/auth/session";
import type { EncryptedToken } from "@/src/features/strava/crypto";
import type { NormalizedStravaActivity } from "@/src/features/strava/activity-sync";
import { StravaIntegrationError } from "@/src/features/strava/errors";
import { createAdminClient } from "@/src/lib/supabase/admin";

export async function requireAthleteSession() {
  const { supabase, user, authError } = await getCurrentSession();

  if (authError || !user) {
    throw new StravaIntegrationError("authentication", "Athlete authentication is required.");
  }

  const { data: mustChangePassword, error: passwordStatusError } = await supabase.rpc(
    "current_user_must_change_password",
  );
  if (passwordStatusError || mustChangePassword) {
    throw new StravaIntegrationError("authentication", "Password change is required before using Strava.");
  }

  const { data: isAthlete, error: roleError } = await supabase.rpc("has_role", {
    p_role_code: "ATHLETE",
  });
  if (roleError || !isAthlete) {
    throw new StravaIntegrationError("authentication", "Athlete access is required.");
  }

  return { supabase, user };
}

function createStravaAdminClient() {
  try {
    return createAdminClient();
  } catch {
    throw new StravaIntegrationError(
      "configuration",
      "Server-only Supabase access is not configured.",
    );
  }
}

export async function storeOAuthState(stateHash: string, expiresAt: Date) {
  const { supabase } = await requireAthleteSession();
  const { error } = await supabase.rpc("create_strava_oauth_state", {
    p_state_hash: stateHash,
    p_expires_at: expiresAt.toISOString(),
  });
  if (error) {
    throw new StravaIntegrationError("storage_failed", "OAuth state could not be stored.");
  }
}

export async function consumeOAuthState(stateHash: string) {
  const { supabase } = await requireAthleteSession();
  const { data, error } = await supabase.rpc("consume_strava_oauth_state", {
    p_state_hash: stateHash,
  });
  if (error || !data) {
    throw new StravaIntegrationError("invalid_state", "OAuth state is invalid or expired.");
  }
}

export async function saveStravaConnection(input: {
  stravaAthleteId: number;
  displayName: string;
  scopes: string[];
  status: "CONNECTED" | "REAUTH_REQUIRED";
  accessToken: EncryptedToken;
  refreshToken: EncryptedToken;
  expiresAt: Date;
}) {
  const { user } = await requireAthleteSession();
  const admin = createStravaAdminClient();
  const { error } = await admin.rpc("upsert_strava_connection", {
    p_athlete_id: user.id,
    p_strava_athlete_id: input.stravaAthleteId,
    p_strava_display_name: input.displayName,
    p_granted_scopes: input.scopes,
    p_connection_status: input.status,
    p_access_token_ciphertext: input.accessToken.ciphertext,
    p_access_token_iv: input.accessToken.iv,
    p_refresh_token_ciphertext: input.refreshToken.ciphertext,
    p_refresh_token_iv: input.refreshToken.iv,
    p_access_token_expires_at: input.expiresAt.toISOString(),
  });
  if (error?.code === "23505") {
    throw new StravaIntegrationError("identity_conflict", "This Strava identity is already connected.");
  }
  if (error?.code === "42501") {
    throw new StravaIntegrationError("permission_denied", "Strava connection is not allowed for this account.");
  }
  if (error) {
    throw new StravaIntegrationError("storage_failed", "Strava connection could not be saved.");
  }
}

export type RefreshLease = Awaited<ReturnType<typeof claimRefreshLease>>;

export async function claimRefreshLease(refreshBefore: Date, lockToken: string) {
  const { user } = await requireAthleteSession();
  const admin = createStravaAdminClient();
  const { data, error } = await admin.rpc("claim_strava_token_refresh", {
    p_athlete_id: user.id,
    p_refresh_before: refreshBefore.toISOString(),
    p_lock_token: lockToken,
    p_lease_seconds: 30,
  });
  if (error || !data[0]) {
    throw new StravaIntegrationError("storage_failed", "Strava refresh state could not be loaded.");
  }
  return { lease: data[0], user };
}

export async function completeRefreshLease(input: {
  lockToken: string;
  tokenVersion: number;
  accessToken: EncryptedToken;
  refreshToken: EncryptedToken;
  expiresAt: Date;
}) {
  const { user } = await requireAthleteSession();
  const admin = createStravaAdminClient();
  const { data, error } = await admin.rpc("complete_strava_token_refresh", {
    p_athlete_id: user.id,
    p_lock_token: input.lockToken,
    p_token_version: input.tokenVersion,
    p_access_token_ciphertext: input.accessToken.ciphertext,
    p_access_token_iv: input.accessToken.iv,
    p_refresh_token_ciphertext: input.refreshToken.ciphertext,
    p_refresh_token_iv: input.refreshToken.iv,
    p_access_token_expires_at: input.expiresAt.toISOString(),
  });
  if (error) {
    throw new StravaIntegrationError("storage_failed", "Refreshed Strava credentials could not be saved.");
  }
  return data;
}

export async function releaseRefreshLease(lockToken: string, tokenVersion: number) {
  const { user } = await requireAthleteSession();
  const admin = createStravaAdminClient();
  await admin.rpc("release_strava_token_refresh", {
    p_athlete_id: user.id,
    p_lock_token: lockToken,
    p_token_version: tokenVersion,
  });
}

export async function claimActivitySyncLease(lockToken: string) {
  const { user } = await requireAthleteSession();
  const admin = createStravaAdminClient();
  const { data, error } = await admin.rpc("claim_strava_activity_sync", {
    p_athlete_id: user.id,
    p_lock_token: lockToken,
    p_lease_seconds: 60,
  });
  if (error || !data[0]) {
    throw new StravaIntegrationError("storage_failed", "Activity sync state could not be loaded.");
  }
  return { lease: data[0], user };
}

export async function completeActivitySync(input: {
  lockToken: string;
  syncStartedAt: Date;
  activities: NormalizedStravaActivity[];
}) {
  const { user } = await requireAthleteSession();
  const admin = createStravaAdminClient();
  const { data, error } = await admin.rpc("complete_strava_activity_sync", {
    p_athlete_id: user.id,
    p_lock_token: input.lockToken,
    p_sync_started_at: input.syncStartedAt.toISOString(),
    p_activities: input.activities,
  });
  if (error || !data[0]) {
    throw new StravaIntegrationError("storage_failed", "Synchronized Activities could not be saved.");
  }
  return data[0];
}

export async function failActivitySync(input: {
  lockToken: string;
  status: "FAILED" | "RATE_LIMITED";
  errorCode: string;
  requireReauth?: boolean;
}) {
  const { user } = await requireAthleteSession();
  const admin = createStravaAdminClient();
  await admin.rpc("fail_strava_activity_sync", {
    p_athlete_id: user.id,
    p_lock_token: input.lockToken,
    p_sync_status: input.status,
    p_error_code: input.errorCode,
    p_require_reauth: input.requireReauth ?? false,
  });
}
