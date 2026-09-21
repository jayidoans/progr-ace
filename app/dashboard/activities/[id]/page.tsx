import Link from "next/link";

import { deleteActivity } from "@/src/features/activities/actions";
import { StravaActivityContextForm } from "@/src/features/activities/components/strava-activity-context-form";
import {
  formatActivityDate,
  formatDistance,
  formatDuration,
  formatPace,
  formatSportType,
} from "@/src/features/activities/format";
import { getActivity } from "@/src/features/activities/queries";

export default async function ActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [{ id }, feedback] = await Promise.all([params, searchParams]);
  const activity = await getActivity(id);
  const isSubmittedEvidence = activity.claimUsage?.status === "SUBMITTED";
  const metrics = [
    ["Distance", formatDistance(activity.distance_m)],
    ["Duration", formatDuration(activity.duration_sec)],
    ["Pace", activity.sport_type === "RUNNING" ? formatPace(activity.distance_m, activity.duration_sec) : "—"],
    ["Average HR", activity.average_hr_bpm ? `${activity.average_hr_bpm} bpm` : "—"],
    ["Maximum HR", activity.max_hr_bpm ? `${activity.max_hr_bpm} bpm` : "—"],
    ["Elevation gain", activity.elevation_gain_m === null ? "—" : `${activity.elevation_gain_m} m`],
    ["RPE", activity.rpe === null ? "—" : `${activity.rpe}/10`],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <Link className="text-sm font-semibold text-indigo-700" href="/dashboard/activities">← Activities</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-700">{formatSportType(activity.sport_type)} · {activity.source}</p>
            <h1 className="mt-2 text-3xl font-bold">{activity.name}</h1>
            <p className="mt-2 text-gray-600">{formatActivityDate(activity.started_at)}</p>
          </div>
          {activity.source === "MANUAL" && !isSubmittedEvidence ? <Link className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-700" href={`/dashboard/activities/${activity.id}/edit`}>Edit</Link> : null}
        </div>
      </header>

      {feedback.message ? <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{feedback.message === "created" ? "Activity created." : feedback.message === "context-updated" ? "Training notes updated." : "Activity updated."}</p> : null}
      {feedback.error ? <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{feedback.error === "invalid-context" ? "Use an RPE from 1 to 10 and keep notes within 4,000 characters." : feedback.error === "context-update-failed" ? "Your training notes could not be updated." : "The activity could not be changed."}</p> : null}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        {activity.source === "STRAVA" ? (
          <p className="mb-5 rounded-md bg-orange-50 px-4 py-3 text-sm text-orange-800">
            Strava metrics cannot be edited. Add your own RPE and notes to describe the session.
          </p>
        ) : null}
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {metrics.map(([label, value]) => <div key={label}><dt className="text-sm text-gray-500">{label}</dt><dd className="mt-1 font-semibold text-gray-950">{value}</dd></div>)}
        </dl>
      </section>

      {activity.source === "STRAVA" ? (
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-bold">Your Training Notes</h2>
          <p className="mt-1 text-sm text-gray-600">
            Add how the session felt and any useful training notes.
          </p>
          {isSubmittedEvidence ? (
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">RPE</p>
                <p className="mt-1 text-sm text-gray-700">{activity.rpe === null ? "Not recorded" : `${activity.rpe}/10`}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{activity.notes ?? "No notes recorded."}</p>
              </div>
              <p className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-600">
                This activity has already been submitted for review, so its RPE and notes can no longer be changed.
              </p>
            </div>
          ) : (
            <div className="mt-5">
              <StravaActivityContextForm activity={activity} />
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-bold">Training notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{activity.notes ?? "No notes added yet."}</p>
        </section>
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-bold">Training session use</h2>
        <p className="mt-2 text-sm text-gray-700">
          {activity.claimUsage?.status === "SUBMITTED"
            ? "This activity was submitted with a training session and can no longer be changed."
            : activity.claimUsage?.status === "DRAFT"
              ? "This activity is part of a saved draft and can still be edited."
              : "Available to add to a training session."}
        </p>
        {activity.claimUsage ? <Link className="mt-3 inline-flex text-sm font-semibold text-indigo-700" href={`/dashboard/claims/${activity.claimUsage.claimId}`}>View training session</Link> : null}
      </section>

      {activity.source === "MANUAL" && !activity.claimUsage ? <form action={deleteActivity} className="border-t border-gray-200 pt-6"><input name="activityId" type="hidden" value={activity.id} /><button className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" type="submit">Delete activity</button><p className="mt-2 text-xs text-gray-500">Deletion is permanent.</p></form> : null}
    </div>
  );
}
