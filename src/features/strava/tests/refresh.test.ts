import assert from "node:assert/strict";
import { test } from "node:test";

import {
  resolveValidAccessToken,
  TokenRefreshResolutionError,
  type TokenRefreshDependencies,
  type TokenRefreshLease,
} from "../refresh-core";

const validLease: TokenRefreshLease = {
  refresh_state: "VALID",
  access_token_ciphertext: "encrypted-access",
  access_token_iv: "access-iv",
  refresh_token_ciphertext: null,
  refresh_token_iv: null,
  token_version: 4,
};

function dependencies(
  overrides: Partial<TokenRefreshDependencies> = {},
): TokenRefreshDependencies {
  return {
    claim: async () => validLease,
    decryptAccess: async () => "current-access",
    decryptRefresh: async () => "current-refresh",
    refresh: async () => ({
      accessToken: "rotated-access",
      refreshToken: "rotated-refresh",
      expiresAt: new Date("2030-01-01T00:00:00Z"),
    }),
    persist: async () => true,
    release: async () => undefined,
    newLockToken: () => "00000000-0000-4000-8000-000000000001",
    wait: async () => undefined,
    now: () => Date.parse("2029-12-31T20:00:00Z"),
    refreshWindowSeconds: 3600,
    ...overrides,
  };
}

test("a sufficiently valid access token is returned without refresh", async () => {
  let refreshCalls = 0;
  const token = await resolveValidAccessToken(
    dependencies({ refresh: async () => {
      refreshCalls += 1;
      throw new Error("must not refresh");
    } }),
  );
  assert.equal(token, "current-access");
  assert.equal(refreshCalls, 0);
});

test("an acquired lease refreshes and persists the rotated refresh token", async () => {
  let persistedRefreshToken = "";
  const token = await resolveValidAccessToken(
    dependencies({
      claim: async () => ({ ...validLease, refresh_state: "ACQUIRED", refresh_token_ciphertext: "encrypted-refresh", refresh_token_iv: "refresh-iv" }),
      persist: async (_lock, version, refreshed) => {
        assert.equal(version, 4);
        persistedRefreshToken = refreshed.refreshToken;
        return true;
      },
    }),
  );
  assert.equal(token, "rotated-access");
  assert.equal(persistedRefreshToken, "rotated-refresh");
});

test("a busy refresh waits and then uses the winner's current token", async () => {
  let claims = 0;
  const token = await resolveValidAccessToken(
    dependencies({
      claim: async () => {
        claims += 1;
        return claims === 1 ? { ...validLease, refresh_state: "BUSY" } : validLease;
      },
    }),
  );
  assert.equal(token, "current-access");
  assert.equal(claims, 2);
});

test("refresh failure releases the lease and never persists stale credentials", async () => {
  let released = false;
  let persisted = false;
  await assert.rejects(() =>
    resolveValidAccessToken(
      dependencies({
        claim: async () => ({ ...validLease, refresh_state: "ACQUIRED", refresh_token_ciphertext: "encrypted-refresh", refresh_token_iv: "refresh-iv" }),
        refresh: async () => {
          throw new Error("provider unavailable");
        },
        persist: async () => {
          persisted = true;
          return true;
        },
        release: async () => {
          released = true;
        },
      }),
    ),
  );
  assert.equal(released, true);
  assert.equal(persisted, false);
});

test("persistent contention produces a deterministic busy error", async () => {
  await assert.rejects(
    () => resolveValidAccessToken(dependencies({ claim: async () => ({ ...validLease, refresh_state: "BUSY" }) })),
    (error: unknown) => error instanceof TokenRefreshResolutionError && error.code === "busy",
  );
});
