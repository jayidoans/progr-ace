import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getSupabasePublicEnv } from "@/src/lib/supabase/env";
import type { Database } from "@/src/types/database";

const secretKeySchema = z.string().trim().min(1);

export function createAdminClient() {
  const parsed = secretKeySchema.safeParse(process.env.SUPABASE_SECRET_KEY);
  if (!parsed.success) {
    throw new Error("Invalid server environment configuration for SUPABASE_SECRET_KEY.");
  }

  const { supabaseUrl } = getSupabasePublicEnv();
  return createSupabaseClient<Database>(supabaseUrl, parsed.data, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
