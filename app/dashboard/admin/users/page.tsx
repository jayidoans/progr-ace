import { getAdminUsers } from "@/src/features/admin/queries";

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Admin</p>
        <h1 className="mt-2 text-3xl font-bold">Manage Users</h1>
        <p className="mt-3 max-w-2xl text-gray-600">View registered users and their access roles in ProgrACE.</p>
      </header>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-xl font-bold">Registered users</h2>
        {users.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No registered users are available.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {users.map((user) => (
              <article className="rounded-lg border border-gray-200 p-4" key={user.id}>
                <p className="font-semibold text-gray-950">{user.fullName ?? "Unnamed user"}</p>
                <p className="mt-1 break-all font-mono text-xs text-gray-500">{user.id}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.roles.length === 0 ? (
                    <span className="text-sm text-gray-500">No roles assigned</span>
                  ) : user.roles.map((role) => (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700" key={role}>
                      {role}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
