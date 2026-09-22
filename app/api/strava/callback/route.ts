import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  exchangeStravaAuthorizationCode,
  revokeStravaToken,
} from "@/src/features/strava/api";
import { getStravaServerConfig } from "@/src/features/strava/config";
import { encryptToken, tokenEncryptionContext } from "@/src/features/strava/crypto";
import { StravaIntegrationError, stravaErrorRedirect } from "@/src/features/strava/errors";
import {
  hasRequiredStravaScopes,
  hashOAuthState,
  oauthStatesMatch,
  parseGrantedScopes,
} from "@/src/features/strava/oauth";
import { requireStravaPermission } from "@/src/features/strava/permission";
import {
  consumeOAuthState,
  requireAthleteSession,
  saveStravaConnection,
} from "@/src/features/strava/repository";
import {
  stravaAthleteDisplayName,
  stravaCallbackSchema,
} from "@/src/features/strava/schemas";
import { getSiteUrl } from "@/src/lib/supabase/env";

export const runtime = "nodejs";

function redirectToIntegration(path: string) {
  return NextResponse.redirect(new URL(path, getSiteUrl()));
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set("prograce_strava_oauth_state", "", {
    httpOnly: true,
    secure: getSiteUrl().startsWith("https://"),
    sameSite: "lax",
    path: "/api/strava/callback",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAthleteSession();
    const parsed = stravaCallbackSchema.safeParse({
      code: request.nextUrl.searchParams.get("code") ?? undefined,
      error: request.nextUrl.searchParams.get("error") ?? undefined,
      scope: request.nextUrl.searchParams.get("scope") ?? undefined,
      state: request.nextUrl.searchParams.get("state") ?? undefined,
    });
    if (!parsed.success || !parsed.data.state) {
      throw new StravaIntegrationError("invalid_state", "OAuth callback state is missing or invalid.");
    }

    const stateCookie = request.cookies.get("prograce_strava_oauth_state")?.value;
    if (!stateCookie || !(await oauthStatesMatch(parsed.data.state, stateCookie))) {
      throw new StravaIntegrationError("invalid_state", "OAuth callback state does not match.");
    }

    await consumeOAuthState(await hashOAuthState(parsed.data.state));

    if (parsed.data.error) {
      throw new StravaIntegrationError("authorization_denied", "Strava authorization was denied.");
    }
    if (!parsed.data.code) {
      throw new StravaIntegrationError("missing_code", "Strava authorization code is missing.");
    }

    await requireStravaPermission();

    const tokenResponse = await exchangeStravaAuthorizationCode(parsed.data.code);
    const callbackScopes = parseGrantedScopes(parsed.data.scope);
    const responseScopes = parseGrantedScopes(tokenResponse.scope);
    const grantedScopes = responseScopes.length > 0 ? responseScopes : callbackScopes;
    const scopeIsComplete =
      hasRequiredStravaScopes(callbackScopes) && hasRequiredStravaScopes(grantedScopes);

    const config = getStravaServerConfig();
    const [accessToken, refreshToken] = await Promise.all([
      encryptToken(
        tokenResponse.access_token,
        config.encryptionKey,
        tokenEncryptionContext(user.id, "access"),
      ),
      encryptToken(
        tokenResponse.refresh_token,
        config.encryptionKey,
        tokenEncryptionContext(user.id, "refresh"),
      ),
    ]);

    try {
      await requireStravaPermission();
      await saveStravaConnection({
        stravaAthleteId: tokenResponse.athlete.id,
        displayName: stravaAthleteDisplayName(tokenResponse.athlete),
        scopes: grantedScopes,
        status: scopeIsComplete ? "CONNECTED" : "REAUTH_REQUIRED",
        accessToken,
        refreshToken,
        expiresAt: new Date(tokenResponse.expires_at * 1000),
      });
    } catch (error) {
      // Avoid leaving a newly authorized but untracked Strava credential behind.
      await revokeStravaToken(tokenResponse.refresh_token).catch(() => undefined);
      throw error;
    }

    return clearStateCookie(
      redirectToIntegration(
        scopeIsComplete
          ? "/dashboard/integrations/strava?message=connected"
          : "/dashboard/integrations/strava?message=permission-required",
      ),
    );
  } catch (error) {
    const code = error instanceof StravaIntegrationError ? error.code : "token_exchange";
    return clearStateCookie(redirectToIntegration(stravaErrorRedirect(code)));
  }
}
