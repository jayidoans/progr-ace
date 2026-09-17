import { STRAVA_API_BASE_URL } from "@/src/features/strava/constants";
import { stravaSummaryActivitiesSchema } from "@/src/features/strava/activity-sync";

type ActivityTransportErrorCode =
  | "authorization"
  | "rate_limited"
  | "provider_unavailable"
  | "network"
  | "malformed_response";

export class StravaActivityTransportError extends Error {
  constructor(
    public readonly code: ActivityTransportErrorCode,
    public readonly status?: number,
  ) {
    super(code);
    this.name = "StravaActivityTransportError";
  }
}

type Fetcher = typeof fetch;

export async function fetchStravaActivitiesPage(
  input: {
    accessToken: string;
    after: number;
    page: number;
    perPage: number;
  },
  fetcher: Fetcher = fetch,
) {
  const url = new URL(`${STRAVA_API_BASE_URL}/athlete/activities`);
  url.searchParams.set("after", String(input.after));
  url.searchParams.set("page", String(input.page));
  url.searchParams.set("per_page", String(input.perPage));

  let response: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetcher(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${input.accessToken}` },
        cache: "no-store",
      });
    } catch {
      if (attempt === 0) continue;
      throw new StravaActivityTransportError("network");
    }
    if (response.status >= 500 && attempt === 0) continue;
    break;
  }

  if (!response) throw new StravaActivityTransportError("network");
  if (response.status === 401 || response.status === 403) {
    throw new StravaActivityTransportError("authorization", response.status);
  }
  if (response.status === 429) {
    throw new StravaActivityTransportError("rate_limited", response.status);
  }
  if (response.status >= 500) {
    throw new StravaActivityTransportError("provider_unavailable", response.status);
  }
  if (!response.ok) {
    throw new StravaActivityTransportError("provider_unavailable", response.status);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new StravaActivityTransportError("malformed_response", response.status);
  }
  const parsed = stravaSummaryActivitiesSchema.safeParse(body);
  if (!parsed.success) {
    throw new StravaActivityTransportError("malformed_response", response.status);
  }
  return parsed.data;
}
