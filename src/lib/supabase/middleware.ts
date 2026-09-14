import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "@/src/lib/supabase/env";
import type { Database } from "@/src/types/database";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { supabasePublishableKey, supabaseUrl } = getSupabasePublicEnv();

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // getUser verifies the JWT and refreshes an expired session when possible.
  await supabase.auth.getUser();

  return response;
}
