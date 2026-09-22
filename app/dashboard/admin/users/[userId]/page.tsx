import Link from "next/link";

import { getAdminUser } from "@/src/features/admin/queries";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = await getAdminUser(userId);

  return <div className="max-w-3xl space-y-6">
    <Link className="text-sm font-semibold text-blue-700" href="/dashboard/admin/users">← Manage Users</Link>
    <header><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Admin</p><h1 className="mt-2 break-words text-3xl font-bold">{user.fullName ?? "Unnamed user"}</h1></header>
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200"><h2 className="text-lg font-bold">Account</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-gray-500">Full name</dt><dd className="break-words font-semibold">{user.fullName ?? "Not provided"}</dd></div><div><dt className="text-gray-500">Email</dt><dd className="break-all font-semibold">{user.email ?? "Not available"}</dd></div></dl></section>
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200"><h2 className="text-lg font-bold">Access roles</h2><div className="mt-4 flex flex-wrap gap-2">{user.roles.length ? user.roles.map((role) => <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700" key={role}>{role}</span>) : <p className="text-sm text-gray-600">No roles assigned.</p>}</div></section>
  </div>;
}
