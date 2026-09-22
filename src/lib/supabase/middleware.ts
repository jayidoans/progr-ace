import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "@/src/lib/supabase/env";
import type { Database } from "@/src/types/database";
import { requiresPasswordGate } from "@/src/features/auth/password-enforcement";

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
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    if (requiresPasswordGate(request.nextUrl.pathname)) {
      const { data: mustChange, error: passwordStatusError } = await supabase.rpc("current_user_must_change_password");
      if (passwordStatusError || mustChange) {
        const url = request.nextUrl.clone();
        url.pathname = "/account/change-password";
        url.search = "";
        const redirect = NextResponse.redirect(url);
        response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
        return redirect;
      }
    }
  }

  return response;
}
