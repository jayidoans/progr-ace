import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { parseDemoBuildEnvFile } from "../src/lib/build/production-env";
import type { Database } from "../src/types/database";

const projectRoot = join(__dirname, "..");

function readValues(path: string) {
  const values: Record<string, string> = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) throw new Error("Invalid demo smoke environment file format.");
    const value = match[2].trim();
    values[match[1]] = /^(['"]).*\1$/.test(value) ? value.slice(1, -1) : value;
  }
  return values;
}

function required(values: Record<string, string>, key: string) {
  const value = values[key]?.trim();
  if (!value) throw new Error(`${key} is required for the demo smoke test.`);
  return value;
}

async function verifyAccount(input: {
  email: string;
  expectedName: string;
  expectedRole: "ATHLETE" | "COACH";
  password: string;
  publishableKey: string;
  supabaseUrl: string;
}) {
  const supabase = createClient<Database>(input.supabaseUrl, input.publishableKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const login = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (login.error || !login.data.user) {
    const code = login.error && "code" in login.error ? login.error.code : "unknown";
    const status = login.error?.status ?? "unknown";
    throw new Error(`${input.expectedRole} demo login failed (status ${status}, code ${code}).`);
  }

  try {
    const profile = await supabase
      .from("profiles")
      .select("id,full_name")
      .eq("id", login.data.user.id)
      .single();
    if (profile.error || profile.data.full_name !== input.expectedName) {
      throw new Error(`${input.expectedRole} profile read verification failed.`);
    }

    const roles = await supabase
      .from("user_roles")
      .select("role:roles(name)")
      .eq("user_id", login.data.user.id);
    if (roles.error || roles.data.length !== 1 || roles.data[0]?.role.name !== input.expectedRole) {
      throw new Error(`${input.expectedRole} role isolation verification failed.`);
    }

    const registry = await supabase.from("demo_read_only_users" as never).select("user_id").limit(1);
    if (!registry.error) throw new Error("The private demo registry was readable by a shared account.");

    // A same-value update is intentionally harmless if the remote guard is missing,
    // while still proving that the table-level trigger rejects authenticated writes.
    const mutation = await supabase
      .from("profiles")
      .update({ full_name: input.expectedName })
      .eq("id", login.data.user.id);
    if (!mutation.error || mutation.error.code !== "42501") {
      throw new Error(`${input.expectedRole} domain mutation was not rejected by the demo guard.`);
    }
  } finally {
    await supabase.auth.signOut({ scope: "local" });
  }
}

async function main() {
  const build = parseDemoBuildEnvFile(readFileSync(join(projectRoot, ".env.demo.local"), "utf8"));
  const seed = readValues(join(projectRoot, ".env.demo.seed.local"));
  const supabaseUrl = required(build, "NEXT_PUBLIC_SUPABASE_URL");
  if (new URL(supabaseUrl).origin !== new URL(required(seed, "PROGRACE_DEMO_SUPABASE_URL")).origin) {
    throw new Error("Demo build and seed files target different Supabase projects.");
  }
  const common = {
    publishableKey: required(build, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    supabaseUrl,
  };
  await verifyAccount({
    ...common,
    email: required(seed, "PROGRACE_DEMO_ATHLETE_EMAIL"),
    password: required(seed, "PROGRACE_DEMO_ATHLETE_PASSWORD"),
    expectedName: "Atlit Strava",
    expectedRole: "ATHLETE",
  });
  await verifyAccount({
    ...common,
    email: required(seed, "PROGRACE_DEMO_COACH_EMAIL"),
    password: required(seed, "PROGRACE_DEMO_COACH_PASSWORD"),
    expectedName: "Kuch",
    expectedRole: "COACH",
  });
  console.info(JSON.stringify({
    event: "demo-read-only-smoke-complete",
    accounts: 2,
    authorizedReads: true,
    privateRegistry: true,
    domainMutationsRejected: true,
  }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Demo read-only smoke test failed.");
  process.exitCode = 1;
});
