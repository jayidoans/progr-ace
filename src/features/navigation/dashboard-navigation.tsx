"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
}: {
  access: DashboardNavigationAccess;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = getDashboardNavigationGroups(access);

  const renderLink = (item: { href: string; label: string }) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={navigationLinkClass(active)}
        href={item.href}
        key={item.href}
        onClick={onNavigate}
      >
        {item.label}
      </Link>
    );
  };

  return groups.map((group) => (
    <div className="flex items-center gap-1" key={group.label}>
      <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
        {group.label}
      </span>
      {group.items.map(renderLink)}
    </div>
  ));
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
            {getDashboardNavigationGroups(access).map((group) => (
              <div className="border-t border-gray-100 pt-2" key={group.label}>
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <Link
                    aria-current={
                      pathname === item.href || pathname.startsWith(`${item.href}/`)
                        ? "page"
                        : undefined
                    }
                    className={`block ${navigationLinkClass(
                      pathname === item.href || pathname.startsWith(`${item.href}/`),
                    )}`}
                    href={item.href}
                    key={item.href}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
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
