import Link from "next/link";

import { ActivityHistory } from "@/src/features/activities/components/activity-history";
import { getActivities } from "@/src/features/activities/queries";
import { syncStravaActivities } from "@/src/features/strava/actions";
import { availableActivitySyncsThisHour } from "@/src/features/strava/activity-sync";
import { LocalSyncTime } from "@/src/features/strava/components/local-sync-time";
import { isCurrentAthleteStravaAllowed } from "@/src/features/strava/permission";
import { getOptionalStravaConnectionSummary, isCurrentUserAthlete } from "@/src/features/strava/queries";

const messages: Record<string, string> = {
  deleted: "Activity deleted.",
  "strava-synced": "Strava activities synchronized.",
};

const errors: Record<string, string> = {
  "invalid-activity": "That activity could not be found.",
  sync_busy: "A Strava synchronization is already in progress.",
  sync_limit_reached: "You have used both Strava synchronizations available for this clock hour.",
  rate_limited: "Strava rate limit reached. Please try again later.",
  reauth_required: "Reconnect Strava before synchronizing activities.",
  activity_sync_failed: "Strava activities could not be synchronized. Existing evidence was preserved.",
  permission_denied: "Strava integration is not currently available for your account.",
};

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const [activities, stravaConnection] = await Promise.all([
    getActivities(),
    getOptionalStravaConnectionSummary(),
  ]);
  const stravaAllowed = await isCurrentUserAthlete() ? await isCurrentAthleteStravaAllowed() : false;
  const availableSyncs = stravaConnection
    ? availableActivitySyncsThisHour({
        hourStartedAt: stravaConnection.activity_sync_hour_started_at,
        attemptCount: stravaConnection.activity_sync_attempt_count,
      })
    : 2;
  const canSync = stravaAllowed && stravaConnection?.connection_status === "CONNECTED" && availableSyncs > 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Evidence</p>
          <h1 className="mt-2 text-3xl font-bold">Activities</h1>
          <p className="mt-3 max-w-2xl text-gray-600">
            Review your recorded activities, add training details, and use them as evidence for scheduled workouts.
          </p>
        </div>
        <div className="w-full space-y-2 sm:w-52">
          <Link
            className="block w-full rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700"
            href="/dashboard/activities/new"
          >
            Add manual activity
          </Link>
          {stravaAllowed && stravaConnection?.connection_status === "CONNECTED" ? (
            <form action={syncStravaActivities}>
              <input name="returnTo" type="hidden" value="activities" />
              <button
                className="w-full rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-200"
                disabled={!canSync}
                type="submit"
              >
                Sync from Strava
              </button>
            </form>
          ) : stravaAllowed ? (
            <Link
              className="block w-full rounded-md bg-gray-200 px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-300"
              href="/dashboard/integrations/strava"
            >
              {stravaConnection ? "Reconnect Strava" : "Connect Strava"}
            </Link>
          ) : <p className="w-full rounded-md bg-gray-100 px-3 py-2 text-center text-xs text-gray-600">Strava is not available for this account.</p>}
          {stravaConnection ? (
            <div className="w-full rounded-md bg-white px-3 py-2 text-xs leading-5 text-gray-600 ring-1 ring-gray-200">
              <p>
                Last sync:{" "}
                {stravaConnection.last_sync_attempt_at
                  ? <LocalSyncTime value={stravaConnection.last_sync_attempt_at} />
                  : "Never"}
              </p>
              <p>Available this hour: {availableSyncs} of 2</p>
            </div>
          ) : stravaAllowed ? (
            <p className="w-full text-center text-xs leading-5 text-gray-500">
              Connect Strava to sync recent activities.
            </p>
          ) : null}
        </div>
      </header>

      {params.message ? <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{messages[params.message] ?? "Activity saved."}</p> : null}
      {params.error ? <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{errors[params.error] ?? "The activity request failed."}</p> : null}

      <ActivityHistory activities={activities} today={new Date().toISOString().slice(0, 10)} />
    </div>
  );
}
