import { readFileSync } from "node:fs";

export const PRODUCTION_PUBLIC_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

export const RUNTIME_ONLY_KEYS = [
  "SUPABASE_SECRET_KEY",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "STRAVA_CLIENT_ID",
  "STRAVA_CLIENT_SECRET",
  "STRAVA_TOKEN_ENCRYPTION_KEY",
] as const;

export function parsePublicEnvFile(contents: string) {
  const values: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) throw new Error("Invalid production public environment file format.");
    const [, key, rawValue] = match;
    if (!PRODUCTION_PUBLIC_KEYS.includes(key as (typeof PRODUCTION_PUBLIC_KEYS)[number])) {
      throw new Error(`Production public environment file must not contain ${key}.`);
    }
    if (key in values) throw new Error(`Duplicate production build variable: ${key}.`);
    const value = rawValue.trim();
    values[key] = /^(['"]).*\1$/.test(value) ? value.slice(1, -1) : value;
  }
  return values;
}

export function readLocalPublishableKey(path = ".env.local") {
  try {
    const contents = readFileSync(path, "utf8");
    const match = contents.match(/^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)$/m);
    return match?.[1]?.trim().replace(/^(['"])(.*)\1$/, "$2") || null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function productionUrl(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is required for a production build.`);
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${name} must be a valid HTTPS URL.`); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || host === "localhost" || host.endsWith(".localhost") ||
      host === "[::1]" || host === "::1" || host === "0.0.0.0" || /^127\./.test(host)) {
    throw new Error(`${name} must use a non-local HTTPS host for a production build.`);
  }
  return url;
}

export function validateProductionBuildEnv(
  env: Record<string, string | undefined>,
  localPublishableKey: string | null = null,
) {
  productionUrl(env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  productionUrl(env.NEXT_PUBLIC_SITE_URL, "NEXT_PUBLIC_SITE_URL");
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!key || /^(?:your-|placeholder|<)/i.test(key)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required for a production build.");
  }
  if (localPublishableKey && key === localPublishableKey) {
    throw new Error("Production build uses the local Supabase publishable key. Supply the production key.");
  }
}
