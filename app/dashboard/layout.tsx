import Link from "next/link";
import { cookies } from "next/headers";

import { getCurrentUserRoles, requireAuthenticatedSession } from "@/src/features/auth/session";
import { BrowserInactivityGuard } from "@/src/features/auth/browser-inactivity-guard";
import { DemoBanner } from "@/src/features/demo/demo-banner";
import { getDemoEnvironment } from "@/src/features/demo/server";
import { DashboardNavigation } from "@/src/features/navigation/dashboard-navigation";
import { AthleteMobileNavigation } from "@/src/features/navigation/athlete-mobile-navigation";
import { NotificationCenter } from "@/src/features/notifications/notification-center";
import {
  measureAsync,
  withPerformanceRequestContext,
} from "@/src/features/performance/diagnostics";
import { getServerPerformanceRequestContext } from "@/src/features/performance/request-context";
import {
  ACTIVE_MODE_STORAGE_KEY,
  resolveActiveMode,
  type ActiveMode,
} from "@/src/features/navigation/active-mode";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const demo = getDemoEnvironment();
  const performance = await getServerPerformanceRequestContext();
  const { user, roles, unreadResult, activeMode } = await measureAsync(
    withPerformanceRequestContext(
      { route: performance.context?.route ?? "dashboard.training", workflow: "dashboard.layout", operation: "data-preparation" },
      performance.context,
    ),
    async () => {
      const { user, supabase } = await measureAsync(
        withPerformanceRequestContext(
          { route: performance.context?.route ?? "dashboard.training", workflow: "dashboard.layout", operation: "authenticated-session" },
          performance.context,
        ),
        () => requireAuthenticatedSession(),
        performance.settings,
      );
      const [roles, unreadResult] = await Promise.all([
        measureAsync(
          withPerformanceRequestContext(
            { route: performance.context?.route ?? "dashboard.training", workflow: "dashboard.layout", operation: "roles-query", queryCount: 1 },
            performance.context,
          ),
          () => getCurrentUserRoles(),
          performance.settings,
        ),
        demo.enabled ? Promise.resolve({ count: 0, error: null }) : measureAsync(
          withPerformanceRequestContext(
            { route: performance.context?.route ?? "dashboard.training", workflow: "dashboard.layout", operation: "notification-unread-count-query", queryCount: 1 },
            performance.context,
          ),
          async () => await supabase.from("notifications").select("id", { count: "exact", head: true })
            .eq("recipient_user_id", user.id).is("read_at", null),
          performance.settings,
        ),
      ]);
      const activeMode = await measureAsync(
        withPerformanceRequestContext(
          { route: performance.context?.route ?? "dashboard.training", workflow: "dashboard.layout", operation: "active-mode-resolution" },
          performance.context,
        ),
        async () => resolveActiveMode(
          roles,
          (await cookies()).get(ACTIVE_MODE_STORAGE_KEY)?.value,
        ) as ActiveMode | null,
        performance.settings,
      );
      return { user, roles, unreadResult, activeMode };
    },
    performance.settings,
  );
  if (unreadResult.error) throw new Error("Unable to load notification status.");

  return (
    <div className="min-h-[100dvh] bg-gray-50 text-gray-950">
      <BrowserInactivityGuard />
      {demo.enabled ? <DemoBanner /> : null}
      <header className="border-b border-gray-200 bg-white pt-[env(safe-area-inset-top)]">
        <div className={`relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 ${activeMode === "ATHLETE" ? "min-h-14 md:min-h-20" : "min-h-20"}`}>
          <Link className={`text-lg font-bold ${activeMode === "ATHLETE" ? "text-emerald-600" : "text-blue-700"}`} href="/dashboard">
            ProgrACE
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <DashboardNavigation
              access={{ activeMode, demoMode: demo.enabled, roles }}
              activeMode={activeMode}
              demoMode={demo.enabled}
              email={user.email}
              roles={roles}
            />
            {demo.enabled ? null : <NotificationCenter initialUnreadCount={unreadResult.count ?? 0} />}
          </div>
        </div>
      </header>
      <main className={`mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8 ${activeMode === "ATHLETE" ? "pb-28 md:pb-[max(1.5rem,env(safe-area-inset-bottom))]" : "pb-[max(1.5rem,env(safe-area-inset-bottom))]"}`}>
        {children}
      </main>
      {activeMode === "ATHLETE" ? <AthleteMobileNavigation /> : null}
    </div>
  );
}
