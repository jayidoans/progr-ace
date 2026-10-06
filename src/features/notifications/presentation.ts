import type { Tables } from "@/src/types/database";

export type NotificationItem = Pick<
  Tables<"notifications">,
  "id" | "title" | "body" | "target_path" | "read_at" | "created_at"
>;

export const RECENT_NOTIFICATION_LIMIT = 10;

export function formatUnreadBadge(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}

export function safeNotificationTarget(path: string | null): string | null {
  return path && /^\/dashboard(?:\/[a-zA-Z0-9_-]+)*$/.test(path) ? path : null;
}

export function formatNotificationTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
