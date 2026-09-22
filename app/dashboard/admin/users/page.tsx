import Link from "next/link";

import { filterAdminUsers } from "@/src/features/admin/directory";
import { getAdminUsers } from "@/src/features/admin/queries";

export default async function AdminUsersPage({ searchParams }: {
  searchParams: Promise<{ search?: string }>;
}) {
  const [users, params] = await Promise.all([getAdminUsers(), searchParams]);
  const search = typeof params.search === "string" ? params.search.slice(0, 100) : "";
  const results = filterAdminUsers(users, search);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Admin</p>
        <h1 className="mt-2 text-3xl font-bold">Manage Users</h1>
        <p className="mt-3 max-w-2xl text-gray-600">View registered users and their access roles in ProgrACE.</p>
      </header>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-6">
        <form action="/dashboard/admin/users" className="flex flex-col gap-3 sm:flex-row sm:items-end" method="get" role="search">
          <label className="min-w-0 flex-1 text-sm font-semibold text-gray-700">Search by name or email
            <input className="mt-2 min-h-11 w-full rounded-md border border-gray-300 px-3 font-normal" defaultValue={search} maxLength={100} name="search" type="search" />
          </label>
          <button className="min-h-11 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700" type="submit">Search</button>
        </form>
        <h2 className="mt-6 text-xl font-bold">Registered users</h2>
        {results.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">{users.length ? "No users match your search." : "No registered users are available."}</p>
        ) : (
          <div className="mt-5 space-y-3">
            {results.map((user) => (
              <article className="rounded-lg border border-gray-200 p-4" key={user.userId}>
                <p className="break-words font-semibold text-gray-950">{user.fullName ?? "Unnamed user"}</p>
                <p className="mt-1 break-all text-sm text-gray-600">{user.email ?? "No email available"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.roles.length === 0 ? (
                    <span className="text-sm text-gray-500">No roles assigned</span>
                  ) : user.roles.map((role) => (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700" key={role}>
                      {role}
                    </span>
                  ))}
                </div>
                <Link className="mt-4 inline-flex min-h-11 items-center rounded-md border border-blue-300 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50" href={`/dashboard/admin/users/${user.userId}`}>View user</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
