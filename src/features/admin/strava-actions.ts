"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminStravaStatus, getAdminUser } from "@/src/features/admin/queries";
import { requireAuthenticatedSession } from "@/src/features/auth/session";
import { disconnectAuthorizedStravaConnection } from "@/src/features/strava/disconnect";
import { StravaIntegrationError } from "@/src/features/strava/errors";

function detailPath(userId: string) {
  return `/dashboard/admin/users/${encodeURIComponent(userId)}`;
}

export async function allowStravaForUser(userId: string) {
  const user = await getAdminUser(userId);
  if (!user.roles.includes("ATHLETE")) redirect(`${detailPath(userId)}?error=athlete-required`);
  const { supabase } = await requireAuthenticatedSession(detailPath(userId));
  const { error } = await supabase.rpc("admin_allow_strava_connection", { p_user_id: userId });
  if (error) redirect(`${detailPath(userId)}?error=action-failed`);
  revalidatePath(detailPath(userId));
  redirect(`${detailPath(userId)}?message=allowed`);
}

export async function revokeStravaForUser(userId: string) {
  await getAdminUser(userId);
  const { supabase } = await requireAuthenticatedSession(detailPath(userId));
  const { error } = await supabase.rpc("admin_revoke_strava_permission", { p_user_id: userId });
  if (error?.code === "23514") redirect(`${detailPath(userId)}?error=disconnect-first`);
  if (error) redirect(`${detailPath(userId)}?error=action-failed`);
  revalidatePath(detailPath(userId));
  redirect(`${detailPath(userId)}?message=revoked`);
}

export async function disconnectStravaForUser(userId: string) {
  const user = await getAdminUser(userId);
  if (!user.roles.includes("ATHLETE")) redirect(`${detailPath(userId)}?error=athlete-required`);
  const status = await getAdminStravaStatus(userId);
  if (!status.connectionStatus) redirect(`${detailPath(userId)}?error=not-connected`);
  try {
    await disconnectAuthorizedStravaConnection(userId);
  } catch (error) {
    if (error instanceof StravaIntegrationError) {
      redirect(`${detailPath(userId)}?error=${error.code === "revoke_failed" ? "revoke-failed" : "action-failed"}`);
    }
    throw error;
  }
  revalidatePath(detailPath(userId));
  revalidatePath("/dashboard/integrations/strava");
  redirect(`${detailPath(userId)}?message=disconnected`);
}
