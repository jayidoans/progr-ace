import Link from "next/link";

import {
  formatActivityDate,
  formatDistance,
  formatDuration,
  formatPace,
  formatSportType,
} from "@/src/features/activities/format";
import type { ActivityWithClaimUsage } from "@/src/features/activities/queries";

export function ActivitySummary({ activity }: { activity: ActivityWithClaimUsage }) {
  return (
    <Link
      className="block rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 hover:ring-indigo-300"
      href={`/dashboard/activities/${activity.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
            {formatSportType(activity.sport_type)}
          </p>
          <h2 className="mt-1 break-words text-lg font-bold text-gray-950">{activity.name}</h2>
          <p className="mt-1 text-sm text-gray-500">{formatActivityDate(activity.started_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
            {activity.source}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              activity.claimUsage?.status === "SUBMITTED"
                ? "bg-emerald-50 text-emerald-700"
                : activity.claimUsage?.status === "DRAFT"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-blue-50 text-blue-700"
            }`}
          >
            {activity.claimUsage?.status === "SUBMITTED"
              ? "Submitted as evidence"
              : activity.claimUsage?.status === "DRAFT"
                ? "Used in draft claim"
                : "Available"}
          </span>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
        <div><dt className="text-gray-500">Distance</dt><dd className="font-semibold">{formatDistance(activity.distance_m)}</dd></div>
        <div><dt className="text-gray-500">Duration</dt><dd className="font-semibold">{formatDuration(activity.duration_sec)}</dd></div>
        <div><dt className="text-gray-500">Pace</dt><dd className="font-semibold">{activity.sport_type === "RUNNING" ? formatPace(activity.distance_m, activity.duration_sec) : "—"}</dd></div>
        <div><dt className="text-gray-500">Average HR</dt><dd className="font-semibold">{activity.average_hr_bpm ? `${activity.average_hr_bpm} bpm` : "—"}</dd></div>
        <div><dt className="text-gray-500">RPE</dt><dd className="font-semibold">{activity.rpe ?? "—"}</dd></div>
      </dl>
      {activity.notes ? <p className="mt-4 line-clamp-2 border-t border-gray-100 pt-4 text-sm text-gray-600">{activity.notes}</p> : null}
    </Link>
  );
}
