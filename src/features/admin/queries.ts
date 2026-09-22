import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireAuthenticatedSession } from "@/src/features/auth/session";
import {
  ACTIVE_MODE_STORAGE_KEY,
  resolveActiveMode,
} from "@/src/features/navigation/active-mode";
import { createClient } from "@/src/lib/supabase/server";

export type AdminUserSummary = {
  id: string;
  fullName: string | null;
  roles: string[];
};

export async function getAdminUsers(): Promise<AdminUserSummary[]> {
  const { user } = await requireAuthenticatedSession("/dashboard/admin/users");
  const supabase = await createClient();
  const { data: ownRoleRows, error: ownRoleError } = await supabase
    .from("user_roles")
    .select("role:roles(name)")
    .eq("user_id", user.id);
  if (ownRoleError) throw new Error("Unable to determine administrator access.");

  const roles = ownRoleRows.map((row) => row.role.name);
  const activeMode = resolveActiveMode(
    roles,
    (await cookies()).get(ACTIVE_MODE_STORAGE_KEY)?.value,
  );
  if (!roles.includes("ADMIN") || activeMode !== "ADMIN") redirect("/dashboard");

  const [{ data: profiles, error: profilesError }, { data: roleRows, error: roleError }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").order("full_name", { ascending: true }),
    supabase.from("user_roles").select("user_id, role:roles(name)").order("user_id", { ascending: true }),
  ]);
  if (profilesError || roleError) throw new Error("Unable to load the user directory.");

  const rolesByUser = new Map<string, string[]>();
  roleRows.forEach((row) => {
    const existing = rolesByUser.get(row.user_id) ?? [];
    existing.push(row.role.name);
    rolesByUser.set(row.user_id, existing);
  });

  return profiles.map((profile) => ({
    id: profile.id,
    fullName: profile.full_name,
    roles: rolesByUser.get(profile.id) ?? [],
  }));
}
