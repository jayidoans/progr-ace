import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { parsePublicEnvFile, validateProductionBuildEnv } from "./production-env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_production_example",
  NEXT_PUBLIC_SITE_URL: "https://progr-ace.idoans.app",
};

test("production build accepts explicit non-local HTTPS public values", () => {
  assert.doesNotThrow(() => validateProductionBuildEnv(valid, "sb_publishable_local_example"));
});

test("production build rejects both loopback spellings", () => {
  for (const url of ["http://127.0.0.1:54321", "http://localhost:54321", "https://localhost:54321"]) {
    assert.throws(() => validateProductionBuildEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: url }), /non-local HTTPS/);
  }
});

test("production build rejects missing public values", () => {
  for (const key of Object.keys(valid)) {
    assert.throws(() => validateProductionBuildEnv({ ...valid, [key]: undefined }), new RegExp(key));
  }
});

test("production build rejects the development publishable key", () => {
  assert.throws(() => validateProductionBuildEnv(valid, valid.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY), /local Supabase publishable key/);
});

test("production public file cannot contain runtime-only secrets", () => {
  assert.deepEqual(parsePublicEnvFile("# public only\nNEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co\n"), {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  });
  assert.throws(() => parsePublicEnvFile("SUPABASE_SECRET_KEY=never\n"), /must not contain/);
  assert.throws(() => parsePublicEnvFile("NEXT_PUBLIC_VAPID_PRIVATE_KEY=never\n"), /must not contain/);
});

test("development does not use the production build guard or overwrite .env.local", () => {
  const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
  assert.match(config, /phase === PHASE_PRODUCTION_BUILD/);
  assert.match(config, /!process\.argv\.includes\("lint"\)/);
  const buildScript = readFileSync(join(process.cwd(), "scripts/production-build.ts"), "utf8");
  assert.doesNotMatch(buildScript, /writeFileSync|renameSync|unlinkSync/);
});

test("runtime secrets remain server-only and are scrubbed from the production build process", () => {
  const buildScript = readFileSync(join(process.cwd(), "scripts/production-build.ts"), "utf8");
  assert.match(buildScript, /for \(const key of RUNTIME_ONLY_KEYS\) env\[key\] = ""/);
  const client = readFileSync(join(process.cwd(), "src/lib/supabase/client.ts"), "utf8");
  assert.doesNotMatch(client, /SUPABASE_SECRET_KEY|VAPID_PRIVATE_KEY|STRAVA_CLIENT_SECRET/);
});
