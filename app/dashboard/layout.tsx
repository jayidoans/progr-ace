import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/src/features/auth/actions";
import { createClient } from "@/src/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link className="text-lg font-bold text-indigo-700" href="/dashboard">
            ProgrACE
          </Link>
          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-4 text-sm font-semibold text-gray-700 md:flex">
              <Link className="hover:text-indigo-600" href="/dashboard">
                Dashboard
              </Link>
              <Link className="hover:text-indigo-600" href="/dashboard/race-goals">
                Race goals
              </Link>
              <Link className="hover:text-indigo-600" href="/dashboard/training">
                Training
              </Link>
              <Link className="hover:text-indigo-600" href="/dashboard/profile">
                Profile
              </Link>
            </nav>
            <span className="hidden text-sm text-gray-600 sm:inline">{user.email}</span>
            <form action={signOut}>
              <button
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <nav className="border-b border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 md:hidden">
        <div className="mx-auto flex max-w-6xl gap-5">
          <Link className="hover:text-indigo-600" href="/dashboard">
            Dashboard
          </Link>
          <Link className="hover:text-indigo-600" href="/dashboard/race-goals">
            Race goals
          </Link>
          <Link className="hover:text-indigo-600" href="/dashboard/training">
            Training
          </Link>
          <Link className="hover:text-indigo-600" href="/dashboard/profile">
            Profile
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
