import assert from "node:assert/strict";
import { test } from "node:test";

import { StravaIntegrationError } from "../errors";
import { exchangeAuthorizationCode, refreshAccessToken, revokeAccess } from "../transport";

const config = { clientId: "12345", clientSecret: "server-secret" };
const futureEpoch = Math.floor(Date.parse("2030-01-01T00:00:00Z") / 1000);
const now = () => Date.parse("2029-01-01T00:00:00Z");

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

test("authorization exchange validates response and keeps secrets out of the URL", async () => {
  let requestedUrl = "";
  let requestBody = "";
  const response = await exchangeAuthorizationCode(
    config,
    "one-time-code",
    async (input, init) => {
      requestedUrl = String(input);
      requestBody = String(init?.body);
      return jsonResponse({
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_at: futureEpoch,
        scope: "read activity:read_all",
        athlete: { id: 700001, firstname: "ProgrACE", lastname: "Runner" },
      });
    },
    now,
  );
  assert.equal(response.athlete.id, 700001);
  assert.equal(requestedUrl, "https://www.strava.com/oauth/token");
  assert.equal(requestedUrl.includes("server-secret"), false);
  assert.match(requestBody, /grant_type=authorization_code/);
});

test("malformed and expired token responses are rejected", async () => {
  await assert.rejects(
    () => exchangeAuthorizationCode(config, "code", async () => jsonResponse({ nope: true }), now),
    (error: unknown) => error instanceof StravaIntegrationError && error.code === "malformed_response",
  );
  await assert.rejects(
    () => exchangeAuthorizationCode(config, "code", async () => jsonResponse({
      access_token: "access",
      refresh_token: "refresh",
      expires_at: 1,
      scope: "read activity:read_all",
      athlete: { id: 1 },
    }), now),
    (error: unknown) => error instanceof StravaIntegrationError && error.code === "malformed_response",
  );
});
test("refresh sends the current refresh token and accepts the rotated token", async () => {
  let requestBody = "";
  const refreshed = await refreshAccessToken(
    config,
    "current-refresh",
    async (_input, init) => {
      requestBody = String(init?.body);
      return jsonResponse({
        access_token: "new-access",
        refresh_token: "rotated-refresh",
        expires_at: futureEpoch,
      });
    },
    now,
  );
  assert.match(requestBody, /refresh_token=current-refresh/);
  assert.equal(refreshed.refresh_token, "rotated-refresh");
});

test("revoke uses the 2026 endpoint and reports provider failure safely", async () => {
  let requestedUrl = "";
  let authorization = "";
  await revokeAccess(config, "refresh-token", async (input, init) => {
    requestedUrl = String(input);
    authorization = new Headers(init?.headers).get("Authorization") ?? "";
    return new Response(null, { status: 200 });
  });
  assert.equal(requestedUrl, "https://www.strava.com/oauth/revoke");
  assert.match(authorization, /^Basic /);

  await assert.rejects(
    () => revokeAccess(config, "refresh-token", async () => new Response(null, { status: 503 })),
    (error: unknown) => error instanceof StravaIntegrationError && error.code === "revoke_failed",
  );
});
