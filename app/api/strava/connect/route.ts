import { NextResponse } from "next/server";

import { STRAVA_STATE_TTL_SECONDS } from "@/src/features/strava/constants";
import { getStravaServerConfig } from "@/src/features/strava/config";
import { StravaIntegrationError, stravaErrorRedirect } from "@/src/features/strava/errors";
import {
  buildStravaAuthorizationUrl,
  generateOAuthState,
  hashOAuthState,
} from "@/src/features/strava/oauth";
import { requireAthleteSession, storeOAuthState } from "@/src/features/strava/repository";
import { requireStravaPermission } from "@/src/features/strava/permission";
import { getSiteUrl } from "@/src/lib/supabase/env";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAthleteSession();
    await requireStravaPermission();
    const config = getStravaServerConfig();
    const state = generateOAuthState();
    const stateHash = await hashOAuthState(state);
    await storeOAuthState(
      stateHash,
      new Date(Date.now() + STRAVA_STATE_TTL_SECONDS * 1000),
    );

    const response = NextResponse.redirect(
      buildStravaAuthorizationUrl({
        clientId: config.clientId,
        redirectUri: config.callbackUrl,
        state,
      }),
    );
    response.cookies.set("prograce_strava_oauth_state", state, {
      httpOnly: true,
      secure: config.callbackUrl.startsWith("https://"),
      sameSite: "lax",
      path: "/api/strava/callback",
      maxAge: STRAVA_STATE_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    const code = error instanceof StravaIntegrationError ? error.code : "configuration";
    if (code === "authentication") {
      return NextResponse.redirect(
        new URL("/login?next=/api/strava/connect", getSiteUrl()),
      );
    }
    return NextResponse.redirect(new URL(stravaErrorRedirect(code), getSiteUrl()));
  }
}
