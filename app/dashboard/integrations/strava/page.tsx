import Link from "next/link";

import { stravaAccessActions } from "@/src/features/strava/access-state";

import { disconnectStrava, syncStravaActivities } from "@/src/features/strava/actions";
import {
  getStravaConnectionSummary,
  type StravaConnectionSummary,
} from "@/src/features/strava/queries";
import { isCurrentAthleteStravaAllowed } from "@/src/features/strava/permission";

const messages: Record<string, string> = {
  connected: "Strava is connected.",
  "permission-required": "Strava is connected, but additional activity permission is required.",
  disconnected: "Strava has been disconnected.",
  synced: "Strava activities synchronized.",
};

const errors: Record<string, string> = {
  configuration: "Strava is not configured on this environment.",
  authentication: "An athlete account is required to manage Strava.",
  permission_denied: "Strava integration is not currently available for your account.",
  authorization_denied: "Strava authorization was cancelled.",
  invalid_state: "The Strava authorization request expired or was already used. Please try again.",
  missing_code: "Strava did not return an authorization code. Please try again.",
  token_exchange: "Strava authorization could not be completed. Please try again.",
  malformed_response: "Strava returned an unexpected response. Please try again.",
  missing_scope: "Additional Strava activity permission is required.",
  identity_conflict: "That Strava athlete is already connected to another ProgrACE account.",
  refresh_failed: "The Strava connection could not be refreshed. Please reconnect.",
  refresh_busy: "The Strava connection is being refreshed. Please try again shortly.",
  revoke_failed: "Strava could not be disconnected right now. No local credentials were removed; please retry.",
  storage_failed: "The Strava connection could not be saved. Please try again.",
  sync_busy: "A Strava synchronization is already in progress.",
  sync_limit_reached: "The limit of two Strava synchronizations for this clock hour has been reached.",
  rate_limited: "Strava rate limit reached. Please try again later.",
  reauth_required: "Strava authorization is no longer valid. Please reconnect.",
  activity_sync_failed: "Strava activities could not be synchronized. Existing evidence was preserved.",
};

function safeCount(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return 0;
  return Number(value);
}

function syncStatusLabel(status: StravaConnectionSummary["activity_sync_status"]) {
  return {
    NEVER: "Never synced",
    SYNCING: "Syncing",
    SUCCEEDED: "Succeeded",
    FAILED: "Failed",
    RATE_LIMITED: "Rate limited",
  }[status];
}

export default async function StravaIntegrationPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    created?: string;
    updated?: string;
    unchanged?: string;
    locked?: string;
  }>;
}) {
  const connection = await getStravaConnectionSummary();
  const [allowed, params] = await Promise.all([isCurrentAthleteStravaAllowed(), searchParams]);
  const message = params.message ? messages[params.message] : undefined;
  const error = params.error ? errors[params.error] : undefined;
  const needsPermission = connection?.connection_status === "REAUTH_REQUIRED";
  const actions = stravaAccessActions({ isAthlete: true, allowed, connectionStatus: connection?.connection_status ?? null });
  const syncCounts = params.message === "synced"
    ? {
        created: safeCount(params.created),
        updated: safeCount(params.updated),
        unchanged: safeCount(params.unchanged),
        locked: safeCount(params.locked),
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
          Integrations
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950">Strava</h1>
        <p className="mt-3 text-gray-600">
          Bring your recent Strava activities into ProgrACE while keeping your training plan and review in one place.
        </p>
      </div>

      {message ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}
      {syncCounts ? (
        <dl className="grid grid-cols-2 gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900 sm:grid-cols-4">
          <div><dt>Created</dt><dd className="font-bold">{syncCounts.created}</dd></div>
          <div><dt>Updated</dt><dd className="font-bold">{syncCounts.updated}</dd></div>
          <div><dt>Unchanged</dt><dd className="font-bold">{syncCounts.unchanged}</dd></div>
          <div><dt>Skipped</dt><dd className="font-bold">{syncCounts.locked}</dd></div>
        </dl>
      ) : null}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <p className="mb-4 text-sm text-gray-600">Permission: <span className="font-semibold">{allowed ? "Allowed" : "Not allowed"}</span></p>
        {!allowed && !connection ? <p className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">Strava integration is not currently available for your account.</p> : null}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-semibold text-gray-500">Connection status</p>
            <h2 className="mt-1 text-xl font-bold text-gray-950">
              {connection ? (needsPermission ? "Permission required" : "Connected") : "Not connected"}
            </h2>
            {connection ? (
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p>Strava athlete: {connection.strava_display_name ?? connection.strava_athlete_id}</p>
                <p>Connected: {new Date(connection.connected_at).toLocaleDateString("en-GB")}</p>
                <p>Activity sync: {syncStatusLabel(connection.activity_sync_status)}</p>
                <p>
                  Last successful sync:{" "}
                  {connection.last_successful_sync_at
                    ? new Date(connection.last_successful_sync_at).toLocaleString("en-GB")
                    : "Never"}
                </p>
              </div>
            ) : (
              <p className="mt-3 max-w-xl text-sm text-gray-600">
                {allowed ? "Connect Strava to bring your recent activities into your training record. You can disconnect at any time." : "Ask an administrator if you need Strava access."}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            {actions.canConnect ? (
              <Link
                className="rounded-md bg-[#FC4C02] px-4 py-2 text-center text-sm font-bold text-white hover:bg-[#e34402]"
                href="/api/strava/connect"
              >
                {connection ? "Reconnect with Strava" : "Connect with Strava"}
              </Link>
            ) : null}
            {actions.canSync ? (
              <form action={syncStravaActivities}>
                <button
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  type="submit"
                >
                  Sync recent activities
                </button>
              </form>
            ) : null}
            {connection ? (
              <form action={disconnectStrava}>
                <button
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  type="submit"
                >
                  Disconnect Strava
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>

      <p className="text-xs text-gray-500">
        Your Strava connection is kept secure and your credentials are never shown here.
      </p>
    </div>
  );
}
