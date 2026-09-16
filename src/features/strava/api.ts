import "server-only";

import { getStravaServerConfig } from "@/src/features/strava/config";
import {
  exchangeAuthorizationCode,
  refreshAccessToken,
  revokeAccess,
} from "@/src/features/strava/transport";

type Fetcher = typeof fetch;

export async function exchangeStravaAuthorizationCode(
  code: string,
  fetcher: Fetcher = fetch,
) {
  const config = getStravaServerConfig();
  return exchangeAuthorizationCode(config, code, fetcher);
}

export async function refreshStravaToken(refreshToken: string, fetcher: Fetcher = fetch) {
  const config = getStravaServerConfig();
  return refreshAccessToken(config, refreshToken, fetcher);
}

export async function revokeStravaToken(token: string, fetcher: Fetcher = fetch) {
  const config = getStravaServerConfig();
  return revokeAccess(config, token, fetcher);
}
