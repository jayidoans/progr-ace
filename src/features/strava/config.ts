import "server-only";

import { z } from "zod";

import { decodeEncryptionKey } from "@/src/features/strava/crypto";
import { StravaIntegrationError } from "@/src/features/strava/errors";
import { getSiteUrl } from "@/src/lib/supabase/env";

const stravaEnvironmentSchema = z.object({
  clientId: z.string().trim().regex(/^\d+$/),
  clientSecret: z.string().trim().min(1),
  encryptionKey: z.string().trim().min(1),
});

export type StravaServerConfig = {
  clientId: string;
  clientSecret: string;
  encryptionKey: Uint8Array;
  callbackUrl: string;
};

let cachedConfig: StravaServerConfig | undefined;

export function getStravaServerConfig(): StravaServerConfig {
  if (cachedConfig) return cachedConfig;

  const parsed = stravaEnvironmentSchema.safeParse({
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    encryptionKey: process.env.STRAVA_TOKEN_ENCRYPTION_KEY,
  });

  if (!parsed.success) {
    throw new StravaIntegrationError(
      "configuration",
      "Invalid server environment configuration for STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_TOKEN_ENCRYPTION_KEY.",
    );
  }

  try {
    cachedConfig = {
      clientId: parsed.data.clientId,
      clientSecret: parsed.data.clientSecret,
      encryptionKey: decodeEncryptionKey(parsed.data.encryptionKey),
      callbackUrl: `${getSiteUrl()}/api/strava/callback`,
    };
  } catch {
    throw new StravaIntegrationError(
      "configuration",
      "STRAVA_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }
  return cachedConfig;
}
