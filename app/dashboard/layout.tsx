import Link from "next/link";
import { cookies } from "next/headers";

import { requireAuthenticatedSession } from "@/src/features/auth/session";
import { DashboardNavigation } from "@/src/features/navigation/dashboard-navigation";
import {
  ACTIVE_MODE_STORAGE_KEY,
  resolveActiveMode,
  type ActiveMode,
} from "@/src/features/navigation/active-mode";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { supabase, user } = await requireAuthenticatedSession();

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role:roles(name)")
    .eq("user_id", user.id);
  if (roleError) throw new Error("Unable to determine dashboard access.");
  const roles = roleRows?.map((row) => row.role.name) ?? [];
  const activeMode = resolveActiveMode(
    roles,
    (await cookies()).get(ACTIVE_MODE_STORAGE_KEY)?.value,
  ) as ActiveMode | null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <header className="border-b border-gray-200 bg-white">
        <div className="relative mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link className={`text-lg font-bold ${activeMode === "ATHLETE" ? "text-emerald-600" : "text-blue-700"}`} href="/dashboard">
            ProgrACE
          </Link>
          <DashboardNavigation
            access={{ activeMode }}
            activeMode={activeMode}
            email={user.email}
            roles={roles}
          />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
