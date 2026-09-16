export type TokenRefreshLease = {
  refresh_state: string;
  access_token_ciphertext: string | null;
  access_token_iv: string | null;
  refresh_token_ciphertext: string | null;
  refresh_token_iv: string | null;
  token_version: number | null;
};

export type RefreshedTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export type TokenRefreshDependencies = {
  claim: (refreshBefore: Date, lockToken: string) => Promise<TokenRefreshLease>;
  decryptAccess: (lease: TokenRefreshLease) => Promise<string>;
  decryptRefresh: (lease: TokenRefreshLease) => Promise<string>;
  refresh: (refreshToken: string) => Promise<RefreshedTokens>;
  persist: (
    lockToken: string,
    tokenVersion: number,
    refreshed: RefreshedTokens,
  ) => Promise<boolean>;
  release: (lockToken: string, tokenVersion: number) => Promise<void>;
  newLockToken: () => string;
  wait: (milliseconds: number) => Promise<void>;
  now: () => number;
  refreshWindowSeconds: number;
};

export class TokenRefreshResolutionError extends Error {
  constructor(public readonly code: "missing" | "busy" | "invalid") {
    super(code);
  }
}

export async function resolveValidAccessToken(deps: TokenRefreshDependencies) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const lockToken = deps.newLockToken();
    const refreshBefore = new Date(deps.now() + deps.refreshWindowSeconds * 1000);
    const lease = await deps.claim(refreshBefore, lockToken);

    if (lease.refresh_state === "MISSING") {
      throw new TokenRefreshResolutionError("missing");
    }
    if (lease.refresh_state === "VALID") {
      return deps.decryptAccess(lease);
    }
    if (lease.refresh_state === "BUSY") {
      await deps.wait(100 * (attempt + 1));
      continue;
    }
    if (lease.refresh_state !== "ACQUIRED" || lease.token_version === null) {
      throw new TokenRefreshResolutionError("invalid");
    }

    try {
      const refreshToken = await deps.decryptRefresh(lease);
      const refreshed = await deps.refresh(refreshToken);
      if (await deps.persist(lockToken, lease.token_version, refreshed)) {
        return refreshed.accessToken;
      }
    } catch (error) {
      await deps.release(lockToken, lease.token_version);
      throw error;
    }
  }

  throw new TokenRefreshResolutionError("busy");
}
