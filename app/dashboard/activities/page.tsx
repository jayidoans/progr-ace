import Link from "next/link";

import { ActivitySummary } from "@/src/features/activities/components/activity-summary";
import { getActivities } from "@/src/features/activities/queries";

const messages: Record<string, string> = {
  deleted: "Activity deleted.",
};

const errors: Record<string, string> = {
  "invalid-activity": "That activity could not be found.",
};

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [activities, params] = await Promise.all([getActivities(), searchParams]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Evidence</p>
          <h1 className="mt-2 text-3xl font-bold">Activities</h1>
          <p className="mt-3 max-w-2xl text-gray-600">
            Record what actually happened. Activities remain separate from your training prescriptions.
          </p>
        </div>
        <Link
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          href="/dashboard/activities/new"
        >
          Add activity
        </Link>
      </header>

      {params.message ? <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{messages[params.message] ?? "Activity saved."}</p> : null}
      {params.error ? <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{errors[params.error] ?? "The activity request failed."}</p> : null}

      {activities.length === 0 ? (
        <section className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
          <h2 className="text-xl font-bold">No activity evidence yet</h2>
          <p className="mt-2 text-sm text-gray-600">Add a run, strength session, walk, ride, padel session, or another activity.</p>
        </section>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => <ActivitySummary activity={activity} key={activity.id} />)}
        </div>
      )}
    </div>
  );
}

