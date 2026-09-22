import "server-only";

import { notFound } from "next/navigation";

import { requireAuthenticatedSession } from "@/src/features/auth/session";

export type AdminUserSummary = {
  userId: string;
  fullName: string | null;
  email: string | null;
  roles: string[];
  stravaConnected?: boolean;
};

export async function getAdminUsers(): Promise<AdminUserSummary[]> {
  const { supabase, user } = await requireAuthenticatedSession("/dashboard/admin/users");
  const { data: ownRoleRows, error: ownRoleError } = await supabase
    .from("user_roles")
    .select("role:roles(name)")
    .eq("user_id", user.id);
  if (ownRoleError) throw new Error("Unable to determine administrator access.");

  if (!ownRoleRows.some((row) => row.role.name === "ADMIN")) notFound();

  const [{ data, error }, { data: states, error: statesError }] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase.rpc("admin_list_user_strava_states"),
  ]);
  if (error || statesError) throw new Error("Unable to load the user directory.");
  const connectedByUser = new Map(states.map((row) => [row.user_id, row.strava_connected]));
  return data.map((row) => ({
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    roles: row.roles,
    stravaConnected: connectedByUser.get(row.user_id) ?? false,
  }));
}

export async function getAdminUser(userId: string): Promise<AdminUserSummary> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) notFound();
  const users = await getAdminUsers();
  const selected = users.find((user) => user.userId === userId);
  if (!selected) notFound();
  return selected;
}

export type AdminStravaStatus = {
  permissionAllowed: boolean;
  permissionGrantedAt: string | null;
  connectionStatus: string | null;
  lastSuccessfulSyncAt: string | null;
};

export async function getAdminStravaStatus(userId: string): Promise<AdminStravaStatus> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) notFound();
  const { supabase } = await requireAuthenticatedSession("/dashboard/admin/users");
  const { data, error } = await supabase.rpc("admin_get_user_strava_status", {
    p_user_id: userId,
  });
  if (error || !data[0]) throw new Error("Unable to load Strava access status.");
  return {
    permissionAllowed: data[0].permission_allowed,
    permissionGrantedAt: data[0].permission_granted_at,
    connectionStatus: data[0].connection_status,
    lastSuccessfulSyncAt: data[0].last_successful_sync_at,
  };
}

export async function getAdminPasswordStatus(userId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) notFound();
  const { supabase } = await requireAuthenticatedSession("/dashboard/admin/users");
  const { data, error } = await supabase.rpc("admin_get_user_password_status", { p_user_id: userId });
  if (error || !data[0]) throw new Error("Unable to load password status.");
  return data[0].must_change_password;
}
