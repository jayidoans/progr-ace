import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  parseDemoBuildEnvFile,
  parsePublicEnvFile,
  validateDemoBuildEnv,
  validateProductionBuildEnv,
} from "./production-env";

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
  const runtime = readFileSync(join(process.cwd(), "src/lib/build/production-env.ts"), "utf8");
  for (const key of [
    "PROGRACE_DEMO_ATHLETE_EMAIL",
    "PROGRACE_DEMO_ATHLETE_PASSWORD",
    "PROGRACE_DEMO_COACH_EMAIL",
    "PROGRACE_DEMO_COACH_PASSWORD",
  ]) {
    assert.match(runtime, new RegExp(`\\"${key}\\"`));
  }
});

test("demo build accepts only the dedicated domain, reference date, and non-production Supabase project", () => {
  const demo = {
    ...valid,
    NEXT_PUBLIC_SUPABASE_URL: "https://demo-project.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_demo_example",
    NEXT_PUBLIC_SITE_URL: "https://demo.progr-ace.idoans.app",
    PROGRACE_DEMO_REFERENCE_DATE: "2027-01-08",
  };
  assert.doesNotThrow(() => validateDemoBuildEnv(demo, {
    localPublishableKey: "sb_publishable_local_example",
    productionPublicEnv: valid,
  }));
  assert.throws(
    () => validateDemoBuildEnv({ ...demo, NEXT_PUBLIC_SITE_URL: valid.NEXT_PUBLIC_SITE_URL }),
    /demo\.progr-ace\.idoans\.app/,
  );
  assert.throws(
    () => validateDemoBuildEnv({ ...demo, PROGRACE_DEMO_REFERENCE_DATE: "2027-02-30" }),
    /valid YYYY-MM-DD/,
  );
  assert.throws(
    () => validateDemoBuildEnv({ ...demo, NEXT_PUBLIC_SUPABASE_URL: valid.NEXT_PUBLIC_SUPABASE_URL }, {
      productionPublicEnv: valid,
    }),
    /production Supabase URL/,
  );
});

test("demo environment file rejects runtime secrets", () => {
  assert.deepEqual(parseDemoBuildEnvFile([
    "NEXT_PUBLIC_SUPABASE_URL=https://demo-project.supabase.co",
    "PROGRACE_DEMO_REFERENCE_DATE=2027-01-08",
  ].join("\n")), {
    NEXT_PUBLIC_SUPABASE_URL: "https://demo-project.supabase.co",
    PROGRACE_DEMO_REFERENCE_DATE: "2027-01-08",
  });
  assert.throws(() => parseDemoBuildEnvFile("SUPABASE_SECRET_KEY=never\n"), /must not contain/);
  assert.throws(() => parseDemoBuildEnvFile("STRAVA_CLIENT_SECRET=never\n"), /must not contain/);
});

test("demo worker configuration is isolated from production background work", () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  assert.match(packageJson.scripts["build:cloudflare:demo"], /demo-build\.ts cloudflare/);
  assert.match(packageJson.scripts["deploy:demo"], /wrangler\.demo\.jsonc/);
  const wrangler = readFileSync(join(process.cwd(), "wrangler.demo.jsonc"), "utf8");
  assert.match(wrangler, /"name": "progr-ace-demo"/);
  assert.match(wrangler, /"service": "progr-ace-demo"/);
  assert.match(wrangler, /"PROGRACE_DEPLOYMENT_MODE": "demo"/);
  assert.match(wrangler, /"PROGRACE_DEMO_REFERENCE_DATE": "2027-01-08"/);
  assert.match(wrangler, /"custom_domain": true/);
  assert.match(wrangler, /"DEMO_LOGIN_RATE_LIMITER"/);
  assert.match(wrangler, /"limit": 10/);
  assert.doesNotMatch(wrangler, /PROGRACE_DEMO_(?:ATHLETE|COACH)_(?:EMAIL|PASSWORD)/);
  assert.doesNotMatch(wrangler, /"crons"/);
  const worker = readFileSync(join(process.cwd(), "custom-worker-demo.ts"), "utf8");
  assert.doesNotMatch(worker, /async scheduled|dispatchPushBatch/);
});
