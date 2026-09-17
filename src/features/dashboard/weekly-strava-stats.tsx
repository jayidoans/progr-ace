import { formatDistance } from "@/src/features/activities/format";
import type { WeeklyStravaStats } from "@/src/features/dashboard/queries";
import { formatTrainingDate } from "@/src/features/training/format";

type WeeklyStravaStatsProps = {
  stats: WeeklyStravaStats | null;
};

export function WeeklyStravaStatsCard({ stats }: WeeklyStravaStatsProps) {
  if (!stats) return null;

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-600">
            This week · Strava
          </p>
          <h2 className="mt-2 text-xl font-bold text-gray-950">Weekly activity stats</h2>
          <p className="mt-1 text-sm text-gray-600">
            {formatTrainingDate(stats.weekStartDate)} – {formatTrainingDate(stats.weekEndDate)}
          </p>
        </div>
        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
          SYNCED EVIDENCE
        </span>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-orange-50/70 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total KM</dt>
          <dd className="mt-2 text-2xl font-bold text-gray-950">
            {formatDistance(stats.runningDistanceM)}
          </dd>
          <dd className="mt-1 text-xs text-gray-600">Running evidence this week</dd>
        </div>
        <div className="rounded-lg bg-gray-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Total activities
          </dt>
          <dd className="mt-2 text-2xl font-bold text-gray-950">{stats.totalActivities}</dd>
          <dd className="mt-1 text-xs text-gray-600">All synced Strava activities</dd>
        </div>
        <div className="rounded-lg bg-gray-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            KM completion
          </dt>
          {stats.completionPercent === null || stats.targetDistanceM === null ? (
            <>
              <dd className="mt-2 text-lg font-bold text-gray-950">No distance target</dd>
              <dd className="mt-1 text-xs text-gray-600">No measurable target this week</dd>
            </>
          ) : (
            <>
              <dd className="mt-2 text-2xl font-bold text-gray-950">
                {stats.completionPercent}%
              </dd>
              <dd className="mt-1 text-xs text-gray-600">
                {formatDistance(stats.runningDistanceM)} of {formatDistance(stats.targetDistanceM)}
              </dd>
              <div
                aria-label="Weekly distance completion"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={Math.min(stats.completionPercent, 100)}
                className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{ width: `${Math.min(stats.completionPercent, 100)}%` }}
                />
              </div>
            </>
          )}
        </div>
      </dl>
    </section>
  );
}
