"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/dashboard/training", label: "Training", icon: CalendarIcon },
  { href: "/dashboard/activities", label: "Activities", icon: ActivityIcon },
  { href: "/dashboard/race-goals", label: "Goals", icon: FlagIcon },
  { href: "/dashboard/profile", label: "Profile", icon: UserIcon },
] as const;

export function AthleteMobileNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Athlete mobile navigation" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center justify-around rounded-[1.8rem] border border-white/80 bg-white/95 px-1.5 py-1.5 shadow-[0_10px_35px_rgba(15,23,42,0.2)] backdrop-blur md:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard"
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            aria-label={label}
            className={`flex min-h-12 min-w-12 flex-col items-center justify-center rounded-2xl px-2 text-[10px] font-bold transition-colors ${
              active ? "bg-emerald-400 text-emerald-950" : "text-gray-500 hover:bg-emerald-50 hover:text-emerald-800"
            }`}
            href={href}
            key={href}
          >
            <Icon />
            <span className="mt-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function IconFrame({ children }: { children: React.ReactNode }) {
  return <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">{children}</svg>;
}

function HomeIcon() {
  return <IconFrame><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" /></IconFrame>;
}

function CalendarIcon() {
  return <IconFrame><rect height="17" rx="2" width="17" x="3.5" y="4.5" /><path d="M8 2.5v4M16 2.5v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></IconFrame>;
}

function ActivityIcon() {
  return <IconFrame><path d="m4 14 4-5 3 3 4-6 5 8" /><path d="M4 19h16" /></IconFrame>;
}

function FlagIcon() {
  return <IconFrame><path d="M5 22V3M5 4c4-2 6 2 10 0 1.2-.7 2.5-.7 4 0v9c-1.5-.7-2.8-.7-4 0-4 2-6-2-10 0" /></IconFrame>;
}

function UserIcon() {
  return <IconFrame><circle cx="12" cy="8" r="3.25" /><path d="M5 21c.9-4 3.2-6 7-6s6.1 2 7 6" /></IconFrame>;
}
