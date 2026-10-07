import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PRODUCTION_PUBLIC_KEYS,
  RUNTIME_ONLY_KEYS,
  parsePublicEnvFile,
  readLocalPublishableKey,
  validateProductionBuildEnv,
} from "../src/lib/build/production-env";

const projectRoot = join(__dirname, "..");
let fileValues: Record<string, string> = {};
try {
  fileValues = parsePublicEnvFile(readFileSync(join(projectRoot, ".env.production.local"), "utf8"));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const env = { ...process.env };
for (const key of PRODUCTION_PUBLIC_KEYS) {
  env[key] = process.env[key] ?? fileValues[key];
}
validateProductionBuildEnv(env, readLocalPublishableKey(join(projectRoot, ".env.local")));

// Runtime-only values come from Cloudflare Dashboard. Empty entries prevent
// Next's env loader from importing local development secrets during the build.
for (const key of RUNTIME_ONLY_KEYS) env[key] = "";
env.PROGRACE_PRODUCTION_BUILD = "1";

const target = process.argv[2];
if (target !== "next" && target !== "cloudflare") throw new Error("Choose next or cloudflare production build.");
const binary = join(projectRoot, "node_modules", ".bin", target === "next" ? "next" : "opennextjs-cloudflare");
const args = target === "next" ? ["build"] : ["build"];
const result = spawnSync(binary, args, { cwd: projectRoot, env, stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
