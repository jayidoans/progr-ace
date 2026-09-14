import { z } from "zod";

const supabasePublicEnvSchema = z.object({
  supabaseUrl: z.string().trim().url(),
  supabasePublishableKey: z.string().trim().min(1),
});

const siteUrlSchema = z.string().trim().url();

type SupabasePublicEnv = z.infer<typeof supabasePublicEnvSchema>;

let cachedSupabasePublicEnv: SupabasePublicEnv | undefined;

function configurationError(variableNames: string[]) {
  return new Error(
    `Invalid environment configuration for ${variableNames.join(
      ", ",
    )}. Configure the project-root .env.local using .env.example.`,
  );
}

export function getSupabasePublicEnv() {
  if (cachedSupabasePublicEnv) {
    return cachedSupabasePublicEnv;
  }

  const parsed = supabasePublicEnvSchema.safeParse({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!parsed.success) {
    throw configurationError([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ]);
  }

  cachedSupabasePublicEnv = parsed.data;
  return cachedSupabasePublicEnv;
}

export function getSiteUrl() {
  const parsed = siteUrlSchema.safeParse(process.env.NEXT_PUBLIC_SITE_URL);

  if (!parsed.success) {
    throw configurationError(["NEXT_PUBLIC_SITE_URL"]);
  }

  return parsed.data.replace(/\/$/, "");
}
