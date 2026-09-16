import { STRAVA_REVOKE_URL, STRAVA_TOKEN_URL } from "./constants";
import { StravaIntegrationError } from "./errors";
import { stravaRefreshResponseSchema, stravaTokenExchangeSchema } from "./schemas";

export type StravaApplicationCredentials = {
  clientId: string;
  clientSecret: string;
};

type Fetcher = typeof fetch;

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new StravaIntegrationError("malformed_response", "Strava returned an invalid response.");
  }
}
export async function exchangeAuthorizationCode(
  config: StravaApplicationCredentials,
  code: string,
  fetcher: Fetcher,
  now = Date.now,
) {
  const response = await fetcher(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    throw new StravaIntegrationError("token_exchange", "Strava authorization could not be completed.");
  }
  const parsed = stravaTokenExchangeSchema.safeParse(await readJson(response));
  if (!parsed.success || parsed.data.expires_at * 1000 <= now()) {
    throw new StravaIntegrationError("malformed_response", "Strava returned incomplete credentials.");
  }
  return parsed.data;
}

export async function refreshAccessToken(
  config: StravaApplicationCredentials,
  refreshToken: string,
  fetcher: Fetcher,
  now = Date.now,
) {
  const response = await fetcher(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!response.ok) {
    throw new StravaIntegrationError("refresh_failed", "Strava credentials could not be refreshed.");
  }
  const parsed = stravaRefreshResponseSchema.safeParse(await readJson(response));
  if (!parsed.success || parsed.data.expires_at * 1000 <= now()) {
    throw new StravaIntegrationError("malformed_response", "Strava returned incomplete refreshed credentials.");
  }
  return parsed.data;
}

export async function revokeAccess(
  config: StravaApplicationCredentials,
  token: string,
  fetcher: Fetcher,
) {
  const response = await fetcher(STRAVA_REVOKE_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ token, token_type_hint: "refresh_token" }),
  });
  if (!response.ok) {
    throw new StravaIntegrationError("revoke_failed", "Strava access could not be revoked.");
  }
}
