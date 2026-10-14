import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DEMO_BUILD_KEYS,
  RUNTIME_ONLY_KEYS,
  parseDemoBuildEnvFile,
  parsePublicEnvFile,
  readLocalPublishableKey,
  validateDemoBuildEnv,
} from "../src/lib/build/production-env";

const projectRoot = join(__dirname, "..");

function readOptional(path: string, parser: (contents: string) => Record<string, string>) {
  try {
    return parser(readFileSync(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

const demoFileValues = readOptional(
  join(projectRoot, ".env.demo.local"),
  parseDemoBuildEnvFile,
);
const productionFileValues = readOptional(
  join(projectRoot, ".env.production.local"),
  parsePublicEnvFile,
);
if (
  !productionFileValues.NEXT_PUBLIC_SUPABASE_URL
  || !productionFileValues.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
) {
  throw new Error(
    "Demo build requires .env.production.local public values so it can reject the production Supabase project.",
  );
}
const env = { ...process.env };
for (const key of DEMO_BUILD_KEYS) {
  env[key] = process.env[key] ?? demoFileValues[key];
}

validateDemoBuildEnv(env, {
  localPublishableKey: readLocalPublishableKey(join(projectRoot, ".env.local")),
  productionPublicEnv: productionFileValues,
});

// Demo builds must never inherit production integration credentials from the
// developer shell or local environment files.
for (const key of RUNTIME_ONLY_KEYS) env[key] = "";
env.PROGRACE_PRODUCTION_BUILD = "1";
env.PROGRACE_DEPLOYMENT_MODE = "demo";

const target = process.argv[2];
if (target !== "next" && target !== "cloudflare") {
  throw new Error("Choose next or cloudflare demo build.");
}
const binary = join(
  projectRoot,
  "node_modules",
  ".bin",
  target === "next" ? "next" : "opennextjs-cloudflare",
);
const args = target === "next"
  ? ["build"]
  : ["build", "--config", "wrangler.demo.jsonc"];
const result = spawnSync(binary, args, { cwd: projectRoot, env, stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
