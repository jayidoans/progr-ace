import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicEnv } from "@/src/lib/supabase/env";
import type { Database } from "@/src/types/database";

export async function createClient() {
  const cookieStore = await cookies();
  const { supabasePublishableKey, supabaseUrl } = getSupabasePublicEnv();

  return createServerClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write cookies. Middleware refreshes them.
          }
        },
      },
    },
  );
}
