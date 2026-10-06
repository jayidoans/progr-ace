import React from "react";

import { formatNotificationTime, type NotificationItem } from "./presentation";

export function NotificationCenterList({
  items,
  busy,
  onOpen,
}: {
  items: NotificationItem[];
  busy: boolean;
  onOpen: (item: NotificationItem) => void;
}) {
  if (items.length === 0) return <p className="py-5 text-sm text-gray-600">No notifications yet.</p>;
  return items.map((item) => (
    <button
      className={`mt-2 block min-h-11 w-full rounded-lg p-3 text-left text-sm hover:bg-gray-50 disabled:opacity-60 ${item.read_at ? "bg-white" : "bg-indigo-50"}`}
      disabled={busy}
      key={item.id}
      onClick={() => onOpen(item)}
      type="button"
    >
      <span className="flex items-start justify-between gap-2"><strong className="font-semibold">{item.title}</strong>{!item.read_at ? <span className="text-xs font-semibold text-indigo-700">Unread</span> : null}</span>
      <span className="mt-1 block leading-5 text-gray-700">{item.body}</span>
      <time className="mt-2 block text-xs text-gray-500" dateTime={item.created_at}>{formatNotificationTime(item.created_at)}</time>
    </button>
  ));
}
