import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/src/lib/supabase/server";

export const getCurrentSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  return { supabase, user, authError };
});

export async function requireAuthenticatedSession(nextPath = "/dashboard") {
  const { supabase, user, authError } = await getCurrentSession();

  if (authError || !user) {
    const params = new URLSearchParams({ next: nextPath });
    redirect(`/login?${params.toString()}`);
  }

  return { supabase, user };
}
