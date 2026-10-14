import { readFileSync } from "node:fs";

export const PRODUCTION_PUBLIC_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

export const DEMO_BUILD_KEYS = [
  ...PRODUCTION_PUBLIC_KEYS,
  "PROGRACE_DEMO_REFERENCE_DATE",
] as const;

export const RUNTIME_ONLY_KEYS = [
  "SUPABASE_SECRET_KEY",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "STRAVA_CLIENT_ID",
  "STRAVA_CLIENT_SECRET",
  "STRAVA_TOKEN_ENCRYPTION_KEY",
  "PROGRACE_DEMO_ATHLETE_EMAIL",
  "PROGRACE_DEMO_ATHLETE_PASSWORD",
  "PROGRACE_DEMO_COACH_EMAIL",
  "PROGRACE_DEMO_COACH_PASSWORD",
] as const;

function parseAllowedEnvFile(contents: string, allowedKeys: readonly string[], label: string) {
  const values: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) throw new Error(`Invalid ${label.toLowerCase()} environment file format.`);
    const [, key, rawValue] = match;
    if (!allowedKeys.includes(key)) {
      throw new Error(`${label} environment file must not contain ${key}.`);
    }
    if (key in values) throw new Error(`Duplicate ${label.toLowerCase()} variable: ${key}.`);
    const value = rawValue.trim();
    values[key] = /^(['"]).*\1$/.test(value) ? value.slice(1, -1) : value;
  }
  return values;
}

export function parsePublicEnvFile(contents: string) {
  return parseAllowedEnvFile(contents, PRODUCTION_PUBLIC_KEYS, "Production public");
}

export function parseDemoBuildEnvFile(contents: string) {
  return parseAllowedEnvFile(contents, DEMO_BUILD_KEYS, "Demo build");
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

function validIsoDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function validateDemoBuildEnv(
  env: Record<string, string | undefined>,
  options: {
    localPublishableKey?: string | null;
    productionPublicEnv?: Record<string, string | undefined>;
  } = {},
) {
  validateProductionBuildEnv(env, options.localPublishableKey ?? null);

  const siteUrl = new URL(env.NEXT_PUBLIC_SITE_URL!);
  if (siteUrl.origin !== "https://demo.progr-ace.idoans.app" || siteUrl.pathname !== "/") {
    throw new Error("Demo build must use NEXT_PUBLIC_SITE_URL=https://demo.progr-ace.idoans.app.");
  }
  if (!validIsoDate(env.PROGRACE_DEMO_REFERENCE_DATE)) {
    throw new Error("PROGRACE_DEMO_REFERENCE_DATE must be a valid YYYY-MM-DD date for a demo build.");
  }

  const production = options.productionPublicEnv;
  if (production?.NEXT_PUBLIC_SUPABASE_URL === env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Demo build must not use the production Supabase URL.");
  }
  if (production?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY === env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Demo build must not use the production Supabase publishable key.");
  }
}
