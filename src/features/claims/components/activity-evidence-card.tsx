import {
  formatActivityDate,
  formatDistance,
  formatDuration,
  formatPace,
  formatSportType,
} from "@/src/features/activities/format";
import type { Activity } from "@/src/features/activities/queries";

type ActivityEvidenceCardProps = {
  activity: Activity;
  control?: React.ReactNode;
  showNote?: boolean;
};

export function ActivityEvidenceCard({
  activity,
  control,
  showNote = false,
}: ActivityEvidenceCardProps) {
  return (
    <article className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        {control}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                {formatSportType(activity.sport_type)}
              </p>
              <h3 className="mt-1 font-bold text-gray-950">{activity.name}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {formatActivityDate(activity.started_at)}
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
              {activity.source}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            {activity.distance_m !== null ? (
              <div>
                <dt className="text-gray-500">Distance</dt>
                <dd className="font-semibold">{formatDistance(activity.distance_m)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-gray-500">Duration</dt>
              <dd className="font-semibold">{formatDuration(activity.duration_sec)}</dd>
            </div>
            {activity.sport_type === "RUNNING" ? (
              <div>
                <dt className="text-gray-500">Pace</dt>
                <dd className="font-semibold">
                  {formatPace(activity.distance_m, activity.duration_sec)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-gray-500">Average HR</dt>
              <dd className="font-semibold">
                {activity.average_hr_bpm ? `${activity.average_hr_bpm} bpm` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">RPE</dt>
              <dd className="font-semibold">{activity.rpe === null ? "—" : `${activity.rpe}/10`}</dd>
            </div>
          </dl>
          {showNote ? (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Activity note</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                {activity.notes ?? "No activity note."}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
