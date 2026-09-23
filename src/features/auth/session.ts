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

const getCurrentPasswordChangeRequirement = cache(async () => {
  const { supabase, user, authError } = await getCurrentSession();
  if (authError || !user) return { mustChangePassword: false, error: authError };

  const { data: mustChangePassword, error } = await supabase.rpc(
    "current_user_must_change_password",
  );
  return { mustChangePassword, error };
});

export const getCurrentUserRoles = cache(async () => {
  const { supabase, user, authError } = await getCurrentSession();
  if (authError || !user) return [];

  const { data: roleRows, error } = await supabase
    .from("user_roles")
    .select("role:roles(name)")
    .eq("user_id", user.id);
  if (error) throw new Error("Unable to determine dashboard access.");
  return roleRows.map((row) => row.role.name);
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
    const { mustChangePassword, error: passwordStatusError } = await getCurrentPasswordChangeRequirement();
    if (passwordStatusError || mustChangePassword) redirect("/account/change-password");
  }

  return { supabase, user };
}
