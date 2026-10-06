"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  loadRecentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./actions";
import {
  formatUnreadBadge,
  safeNotificationTarget,
  type NotificationItem,
} from "./presentation";
import { NotificationCenterList } from "./notification-center-list";

export function NotificationCenter({ initialUnreadCount }: { initialUnreadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setUnreadCount(initialUnreadCount), [initialUnreadCount]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const openCenter = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setError(false);
    setItems(null);
    try {
      setItems(await loadRecentNotifications());
    } catch {
      setError(true);
    }
  };

  const openItem = async (item: NotificationItem) => {
    if (busy) return;
    setBusy(true);
    try {
      const allowed = await markNotificationRead(item.id);
      if (!allowed) return;
      if (!item.read_at) setUnreadCount((count) => Math.max(0, count - 1));
      setItems((current) => current?.map((entry) => entry.id === item.id
        ? { ...entry, read_at: entry.read_at ?? new Date().toISOString() }
        : entry) ?? null);
      const target = safeNotificationTarget(item.target_path);
      if (target) {
        setOpen(false);
        router.push(target);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const markAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setItems((current) => current?.map((item) => ({
        ...item,
        read_at: item.read_at ?? new Date().toISOString(),
      })) ?? null);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const badge = formatUnreadBadge(unreadCount);
  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
        onClick={openCenter}
        ref={triggerRef}
        type="button"
      >
        <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {badge ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-indigo-700 px-1 text-center text-[10px] font-bold leading-5 text-white">{badge}</span> : null}
      </button>
      {open ? (
        <section aria-label="Notifications" className="absolute right-0 top-full z-40 mt-2 max-h-[min(70dvh,30rem)] w-[min(21rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 text-gray-950 shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
            <h2 className="font-bold">Notifications</h2>
            {unreadCount > 0 ? <button className="min-h-9 text-xs font-semibold text-indigo-700 hover:underline disabled:opacity-50" disabled={busy} onClick={markAll} type="button">Mark all as read</button> : null}
          </div>
          {error ? <p className="mt-3 text-sm text-red-700" role="alert">Notifications could not be updated. Please try again.</p> : null}
          {items === null && !error ? <p className="py-5 text-sm text-gray-600">Loading notifications…</p> : null}
          {items ? <NotificationCenterList busy={busy} items={items} onOpen={(item) => void openItem(item)} /> : null}
        </section>
      ) : null}
    </div>
  );
}
