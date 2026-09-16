import assert from "node:assert/strict";
import { test } from "node:test";

import { decryptToken, encryptToken } from "../crypto";
import {
  buildStravaAuthorizationUrl,
  generateOAuthState,
  hasRequiredStravaScopes,
  hashOAuthState,
  oauthStatesMatch,
  parseGrantedScopes,
} from "../oauth";
import { stravaCallbackSchema, stravaTokenExchangeSchema } from "../schemas";

test("authorization URL uses the official endpoint, exact callback, scopes, and opaque state", () => {
  const state = generateOAuthState();
  const url = buildStravaAuthorizationUrl({
    clientId: "12345",
    redirectUri: "https://example.test/api/strava/callback",
    state,
  });

  assert.equal(url.origin + url.pathname, "https://www.strava.com/oauth/authorize");
  assert.equal(url.searchParams.get("client_id"), "12345");
  assert.equal(url.searchParams.get("redirect_uri"), "https://example.test/api/strava/callback");
  assert.equal(url.searchParams.get("scope"), "read,activity:read_all");
  assert.equal(url.searchParams.get("state"), state);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.ok(state.length >= 43);
});

test("OAuth states are high entropy, hashable, and mismatch safely", async () => {
  const states = new Set(Array.from({ length: 32 }, generateOAuthState));
  assert.equal(states.size, 32);
  const [first, second] = Array.from(states);
  assert.match(await hashOAuthState(first), /^[0-9a-f]{64}$/);
  assert.equal(await oauthStatesMatch(first, first), true);
  assert.equal(await oauthStatesMatch(first, second), false);
});

test("scope parsing accepts Strava comma and space forms but requires both scopes", () => {
  assert.deepEqual(parseGrantedScopes("activity:read_all,read read"), [
    "activity:read_all",
    "read",
  ]);
  assert.equal(hasRequiredStravaScopes(["read", "activity:read_all"]), true);
  assert.equal(hasRequiredStravaScopes(["read"]), false);
});

test("callback and token responses reject malformed external input", () => {
  assert.equal(stravaCallbackSchema.safeParse({ state: "short", code: "code" }).success, false);
  assert.equal(stravaCallbackSchema.safeParse({ state: "a".repeat(43) }).success, false);
  assert.equal(
    stravaTokenExchangeSchema.safeParse({
      access_token: "access",
      refresh_token: "refresh",
      expires_at: 123,
      athlete: {},
    }).success,
    false,
  );
});

test("AES-GCM token encryption uses fresh IVs and binds ciphertext to its context", async () => {
  const key = crypto.getRandomValues(new Uint8Array(32));
  const first = await encryptToken("secret-token", key, "athlete-a:access");
  const second = await encryptToken("secret-token", key, "athlete-a:access");

  assert.notEqual(first.ciphertext, "secret-token");
  assert.notEqual(first.iv, second.iv);
  assert.equal(await decryptToken(first, key, "athlete-a:access"), "secret-token");
  await assert.rejects(() => decryptToken(first, key, "athlete-b:access"));
});
