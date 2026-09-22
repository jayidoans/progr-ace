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

export async function requireAuthenticatedSession(
  nextPath = "/dashboard",
  options: { allowForcedPasswordChange?: boolean } = {},
) {
  const { supabase, user, authError } = await getCurrentSession();

  if (authError || !user) {
    const params = new URLSearchParams({ next: nextPath });
    redirect(`/login?${params.toString()}`);
  }

  if (!options.allowForcedPasswordChange) {
    const { data: mustChangePassword, error: passwordStatusError } = await supabase.rpc(
      "current_user_must_change_password",
    );
    if (passwordStatusError || mustChangePassword) redirect("/account/change-password");
  }

  return { supabase, user };
}
