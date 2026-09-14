import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "@/src/lib/supabase/env";
import type { Database } from "@/src/types/database";

export function createClient() {
  const { supabasePublishableKey, supabaseUrl } = getSupabasePublicEnv();

  return createBrowserClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
  );
}
