export type StravaErrorCode =
  | "configuration"
  | "authentication"
  | "permission_denied"
  | "authorization_denied"
  | "invalid_state"
  | "missing_code"
  | "token_exchange"
  | "malformed_response"
  | "missing_scope"
  | "identity_conflict"
  | "refresh_failed"
  | "refresh_busy"
  | "revoke_failed"
  | "storage_failed"
  | "sync_busy"
  | "sync_limit_reached"
  | "rate_limited"
  | "reauth_required"
  | "activity_sync_failed";

export class StravaIntegrationError extends Error {
  constructor(
    public readonly code: StravaErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "StravaIntegrationError";
  }
}

export function stravaErrorRedirect(code: StravaErrorCode) {
  return `/dashboard/integrations/strava?error=${encodeURIComponent(code)}`;
}
