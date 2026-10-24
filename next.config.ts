import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

import {
  readLocalPublishableKey,
  validateDemoBuildEnv,
  validateProductionBuildEnv,
} from "./src/lib/build/production-env";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) {
    if (process.env.PROGRACE_PRODUCTION_BUILD !== "1") {
      throw new Error("Production builds must use npm run build:production or npm run build:cloudflare:production. Local .env.local is not safe for deployment.");
    }
    if (process.env.PROGRACE_DEPLOYMENT_MODE === "demo") {
      validateDemoBuildEnv(process.env, {
        localPublishableKey: readLocalPublishableKey(),
      });
    } else {
      validateProductionBuildEnv(process.env, readLocalPublishableKey());
    }
  }
  return nextConfig;
}
