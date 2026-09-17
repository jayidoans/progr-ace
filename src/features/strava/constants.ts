export const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
export const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
export const STRAVA_REVOKE_URL = "https://www.strava.com/oauth/revoke";
export const STRAVA_API_BASE_URL = "https://www.strava.com/api/v3";

export const STRAVA_REQUIRED_SCOPES = ["read", "activity:read_all"] as const;
export const STRAVA_STATE_TTL_SECONDS = 10 * 60;
export const STRAVA_REFRESH_WINDOW_SECONDS = 60 * 60;
export const STRAVA_REFRESH_LEASE_SECONDS = 30;

export type StravaConnectionStatus = "CONNECTED" | "REAUTH_REQUIRED";
