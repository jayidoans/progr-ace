import Link from "next/link";
import { cookies } from "next/headers";

import { getCurrentUserRoles, requireAuthenticatedSession } from "@/src/features/auth/session";
import { DashboardNavigation } from "@/src/features/navigation/dashboard-navigation";
import { NotificationCenter } from "@/src/features/notifications/notification-center";
import {
  ACTIVE_MODE_STORAGE_KEY,
  resolveActiveMode,
  type ActiveMode,
} from "@/src/features/navigation/active-mode";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, supabase } = await requireAuthenticatedSession();

  const [roles, unreadResult] = await Promise.all([
    getCurrentUserRoles(),
    supabase.from("notifications").select("id", { count: "exact", head: true })
      .eq("recipient_user_id", user.id).is("read_at", null),
  ]);
  if (unreadResult.error) throw new Error("Unable to load notification status.");
  const activeMode = resolveActiveMode(
    roles,
    (await cookies()).get(ACTIVE_MODE_STORAGE_KEY)?.value,
  ) as ActiveMode | null;

  return (
    <div className="min-h-[100dvh] bg-gray-50 text-gray-950">
      <header className="border-b border-gray-200 bg-white pt-[env(safe-area-inset-top)]">
        <div className="relative mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link className={`text-lg font-bold ${activeMode === "ATHLETE" ? "text-emerald-600" : "text-blue-700"}`} href="/dashboard">
            ProgrACE
          </Link>
          <DashboardNavigation
            access={{ activeMode, roles }}
            activeMode={activeMode}
            email={user.email}
            roles={roles}
          />
          <NotificationCenter initialUnreadCount={unreadResult.count ?? 0} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-8">
        {children}
      </main>
    </div>
  );
}
