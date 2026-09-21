"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOut } from "@/src/features/auth/actions";
import { ModeSwitcher } from "@/src/features/navigation/mode-switcher";
import {
  getDashboardNavigationGroups,
  type DashboardNavigationAccess,
} from "@/src/features/navigation/items";

function navigationLinkClass(active: boolean) {
  return `rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
    active
      ? "bg-indigo-50 text-indigo-700"
      : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
  }`;
}

function GroupedNavigationLinks({
  access,
  onNavigate,
  mobile = false,
}: {
  access: DashboardNavigationAccess;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const groups = getDashboardNavigationGroups(access);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navigationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpenGroup(null);
  }, [pathname]);

  useEffect(() => {
    if (!openGroup) return;

    const closeWhenClickedOutside = (event: PointerEvent) => {
      if (navigationRef.current && !navigationRef.current.contains(event.target as Node)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener("pointerdown", closeWhenClickedOutside);
    return () => document.removeEventListener("pointerdown", closeWhenClickedOutside);
  }, [openGroup]);

  const renderLink = (item: { href: string; label: string }) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={`block w-full ${navigationLinkClass(active)}`}
        href={item.href}
        key={item.href}
        onClick={onNavigate}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className={mobile ? "contents" : "flex items-center gap-1"} ref={navigationRef}>
      {groups.map((group) => {
        const active = group.items.some(
          (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
        );
        return (
          <div className={mobile ? "border-t border-gray-100 pt-2" : "group relative"} key={group.label}>
            <button
              aria-expanded={openGroup === group.label}
              aria-haspopup="menu"
              className={`flex min-h-11 ${mobile ? "w-full" : ""} cursor-pointer list-none items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm font-semibold ${
                active ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
              } [&::-webkit-details-marker]:hidden`}
              onClick={() => setOpenGroup((current) => (current === group.label ? null : group.label))}
              type="button"
            >
              <span>{group.label}</span>
              <span aria-hidden="true" className="text-xs">⌄</span>
            </button>
            {openGroup === group.label ? (
              <div
                className={
                  mobile
                    ? "mt-1 space-y-1 pl-2"
                    : "absolute left-0 top-full z-30 mt-1 min-w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
                }
                role="menu"
              >
                {group.items.map(renderLink)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function DashboardNavigation({
  access,
  email,
  roles,
  activeMode,
}: {
  access: DashboardNavigationAccess;
  email: string | undefined;
  roles: string[];
  activeMode: "ATHLETE" | "COACH" | "ADMIN" | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <div className="hidden items-center gap-2 lg:flex">
        <ModeSwitcher activeMode={activeMode} roles={roles} />
        <nav aria-label="Primary navigation" className="flex items-center gap-1">
          <Link
            aria-current={pathname === "/dashboard" ? "page" : undefined}
            className={navigationLinkClass(pathname === "/dashboard")}
            href="/dashboard"
          >
            Dashboard
          </Link>
          <GroupedNavigationLinks access={access} />
        </nav>
        {email ? (
          <span className="hidden max-w-44 truncate text-sm text-gray-600 xl:inline">{email}</span>
        ) : null}
        <form action={signOut}>
          <button
            className="min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </div>

      <button
        aria-controls="mobile-navigation"
        aria-expanded={open}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-gray-300 text-2xl leading-none text-gray-800 hover:bg-gray-50 lg:hidden"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true">{open ? "×" : "☰"}</span>
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 top-full z-20 border-t border-gray-200 bg-white shadow-lg lg:hidden"
          id="mobile-navigation"
        >
          <nav
            aria-label="Mobile primary navigation"
            className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6"
          >
            <ModeSwitcher activeMode={activeMode} roles={roles} />
            <Link
              aria-current={pathname === "/dashboard" ? "page" : undefined}
              className={navigationLinkClass(pathname === "/dashboard")}
              href="/dashboard"
              onClick={() => setOpen(false)}
            >
              Dashboard
            </Link>
            <GroupedNavigationLinks access={access} mobile onNavigate={() => setOpen(false)} />
            <div className="mt-2 border-t border-gray-200 pt-3">
              {email ? <p className="mb-2 break-all px-3 text-xs text-gray-500">{email}</p> : null}
              <form action={signOut}>
                <button
                  className="min-h-11 w-full rounded-md px-3 py-2.5 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
