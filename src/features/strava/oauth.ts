import {
  STRAVA_AUTHORIZE_URL,
  STRAVA_REQUIRED_SCOPES,
} from "@/src/features/strava/constants";

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function generateOAuthState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function hashOAuthState(state: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state));
  return bytesToHex(new Uint8Array(digest));
}

export async function oauthStatesMatch(left: string, right: string) {
  if (!left || !right) return false;
  const [leftHash, rightHash] = await Promise.all([
    hashOAuthState(left),
    hashOAuthState(right),
  ]);
  return leftHash === rightHash;
}

export function parseGrantedScopes(value: string | undefined) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(/[\s,]+/)
        .map((scope) => scope.trim())
        .filter(Boolean),
    ),
  ).sort();
}

export function hasRequiredStravaScopes(scopes: readonly string[]) {
  return STRAVA_REQUIRED_SCOPES.every((required) => scopes.includes(required));
}

export function buildStravaAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL(STRAVA_AUTHORIZE_URL);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", STRAVA_REQUIRED_SCOPES.join(","));
  url.searchParams.set("state", input.state);
  return url;
}
