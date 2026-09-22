import Link from "next/link";

import { getAdminPasswordStatus, getAdminStravaStatus, getAdminUser } from "@/src/features/admin/queries";
import { allowStravaForUser, disconnectStravaForUser, revokeStravaForUser } from "@/src/features/admin/strava-actions";
import { stravaAccessActions } from "@/src/features/strava/access-state";
import { ResetPasswordForm } from "@/src/features/admin/reset-password-form";
import { requireAuthenticatedSession } from "@/src/features/auth/session";

const messages: Record<string, string> = {
  allowed: "Strava connection is now available for this athlete.",
  revoked: "Strava connection permission has been removed.",
  disconnected: "Strava was disconnected. Previously imported activities remain available.",
};
const errors: Record<string, string> = {
  "athlete-required": "Only athletes can be given Strava access.",
  "disconnect-first": "Disconnect the existing Strava connection before removing permission.",
  "not-connected": "This user is not connected to Strava.",
  "revoke-failed": "Strava could not be disconnected. The connection was retained so you can try again.",
  "action-failed": "The Strava access change could not be completed. Please try again.",
};

export default async function AdminUserDetailPage({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: Promise<{ message?: string; error?: string }> }) {
  const { userId } = await params;
  const user = await getAdminUser(userId);
  const [strava, passwordChangeRequired, query, session] = await Promise.all([
    getAdminStravaStatus(userId), getAdminPasswordStatus(userId), searchParams,
    requireAuthenticatedSession(`/dashboard/admin/users/${userId}`),
  ]);
  const hasAthleteRole = user.roles.includes("ATHLETE");
  const actions = stravaAccessActions({ isAthlete: hasAthleteRole, allowed: strava.permissionAllowed, connectionStatus: strava.connectionStatus });

  return <div className="max-w-3xl space-y-6">
    <Link className="text-sm font-semibold text-blue-700" href="/dashboard/admin/users">← Manage Users</Link>
    <header><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Admin</p><h1 className="mt-2 break-words text-3xl font-bold">{user.fullName ?? "Unnamed user"}</h1></header>
    {query.message && messages[query.message] ? <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{messages[query.message]}</p> : null}
    {query.error && errors[query.error] ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{errors[query.error]}</p> : null}
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200"><h2 className="text-lg font-bold">Account</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-gray-500">Full name</dt><dd className="break-words font-semibold">{user.fullName ?? "Not provided"}</dd></div><div><dt className="text-gray-500">Email</dt><dd className="break-all font-semibold">{user.email ?? "Not available"}</dd></div><div><dt className="text-gray-500">Password status</dt><dd className="font-semibold">{passwordChangeRequired ? "Password change required" : "Current"}</dd></div></dl>{session.user.id !== userId ? <ResetPasswordForm userId={userId} /> : <p className="mt-5 text-sm text-gray-600">Use Change My Password in your Profile for your own account.</p>}</section>
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200"><h2 className="text-lg font-bold">Access roles</h2><div className="mt-4 flex flex-wrap gap-2">{user.roles.length ? user.roles.map((role) => <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700" key={role}>{role}</span>) : <p className="text-sm text-gray-600">No roles assigned.</p>}</div></section>
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-lg font-bold">Strava Access</h2>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-gray-500">Permission</dt><dd className="font-semibold">{strava.permissionAllowed ? "Allowed" : "Not allowed"}</dd></div>
        <div><dt className="text-gray-500">Connection</dt><dd className="font-semibold">{strava.connectionStatus === "CONNECTED" ? "Connected" : strava.connectionStatus === "REAUTH_REQUIRED" ? "Reconnect required" : "Not connected"}</dd></div>
        {strava.lastSuccessfulSyncAt ? <div><dt className="text-gray-500">Last successful sync</dt><dd className="font-semibold">{new Date(strava.lastSuccessfulSyncAt).toLocaleString("en-GB")}</dd></div> : null}
      </dl>
      {actions.canAllow ? <form action={allowStravaForUser.bind(null, userId)} className="mt-6"><button className="min-h-11 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white" type="submit">Allow Strava Connection</button></form> : null}
      {actions.canRevoke ? <details className="mt-6 rounded-lg border border-gray-200 p-4 text-sm"><summary className="cursor-pointer font-semibold">Revoke Strava Permission</summary><p className="mt-3 text-gray-600">This athlete will no longer be able to connect Strava. An existing connection must be disconnected first.</p><form action={revokeStravaForUser.bind(null, userId)} className="mt-4"><button className="min-h-11 rounded-md border border-red-600 px-4 py-2 font-semibold text-red-700" type="submit">Confirm revoke permission</button></form></details> : null}
      {actions.canDisconnect ? <details className="mt-6 rounded-lg border border-gray-200 p-4 text-sm"><summary className="cursor-pointer font-semibold">Disconnect Strava</summary><p className="mt-3 text-gray-600">This removes the user&apos;s Strava connection. Previously imported activities and training history will remain. Permission stays allowed until you revoke it separately.</p><form action={disconnectStravaForUser.bind(null, userId)} className="mt-4"><button className="min-h-11 rounded-md border border-red-600 px-4 py-2 font-semibold text-red-700" type="submit">Confirm disconnect</button></form></details> : null}
      {!hasAthleteRole ? <p className="mt-4 text-sm text-gray-600">Strava access is available only to athletes.</p> : null}
    </section>
  </div>;
}
