"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedSession } from "@/src/features/auth/session";
import type { NotificationItem } from "./presentation";
import { RECENT_NOTIFICATION_LIMIT } from "./presentation";

export async function loadRecentNotifications(): Promise<NotificationItem[]> {
  const { supabase, user } = await requireAuthenticatedSession();
  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,body,target_path,read_at,created_at")
    .eq("recipient_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(RECENT_NOTIFICATION_LIMIT);
  if (error) throw new Error("Unable to load notifications.");
  return data;
}

export async function markNotificationRead(id: string): Promise<boolean> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return false;
  }
  const { supabase } = await requireAuthenticatedSession();
  const { data, error } = await supabase.rpc("mark_notification_read", { p_notification_id: id });
  if (error) throw new Error("Unable to mark notification as read.");
  revalidatePath("/dashboard", "layout");
  return data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const { supabase } = await requireAuthenticatedSession();
  const { data, error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw new Error("Unable to mark notifications as read.");
  revalidatePath("/dashboard", "layout");
  return data;
}
