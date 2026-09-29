import type { ProgramRunningAnalytics } from "@/src/features/running-analytics/domain";
import {
  formatDistanceM,
  formatDurationSeconds,
  summarizeCoachProgramProgress,
} from "@/src/features/running-analytics/presentation";

function formatPercent(value: number | null) {
  return value === null ? "—" : `${Math.round(value)}%`;
}

export function CoachProgramStatistics({ data }: { data: ProgramRunningAnalytics }) {
  const summary = summarizeCoachProgramProgress(data);
  const maximumPercent = Math.max(
    100,
    ...summary.weeklyFulfillment.map((week) => week.actualPercent ?? 0),
  );

  return (
    <section className="mt-6 border-t border-gray-200 pt-6" aria-labelledby={`program-statistics-${data.context.programId}`}>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Running statistics</p>
        <h3 className="mt-1 text-lg font-bold text-gray-950" id={`program-statistics-${data.context.programId}`}>
          Program fulfillment
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Based on explicit planned running distance and submitted running Activities. Duration-only sessions do not create estimated distance.
        </p>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-blue-50 p-4">
          <dt className="text-xs font-bold uppercase tracking-wide text-blue-700">Average weekly fulfillment</dt>
          <dd className="mt-2 text-2xl font-bold text-gray-950">{formatPercent(summary.averageWeeklyFulfillmentPercent)}</dd>
          <p className="mt-1 text-xs text-gray-600">Completed weeks with recorded distance; current week excluded.</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-4">
          <dt className="text-xs font-bold uppercase tracking-wide text-emerald-700">Total training time</dt>
          <dd className="mt-2 text-2xl font-bold text-gray-950">{formatDurationSeconds(summary.totalClaimedRunningDurationSec)}</dd>
          <p className="mt-1 text-xs text-gray-600">Submitted running Activities only.</p>
        </div>
        <div className="rounded-lg bg-indigo-50 p-4">
          <dt className="text-xs font-bold uppercase tracking-wide text-indigo-700">Total training distance</dt>
          <dd className="mt-2 text-2xl font-bold text-gray-950">{formatDistanceM(summary.totalClaimedRunningDistanceM)}</dd>
          <p className="mt-1 text-xs text-gray-600">Each Activity is counted once.</p>
        </div>
      </dl>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-bold text-gray-950">Weekly distance fulfillment</h4>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-gray-700" aria-label="Chart legend">
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-blue-200" />Target</span>
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-emerald-200" />Actual: target reached</span>
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-orange-200" />Actual: below target</span>
          </div>
        </div>

        {summary.weeklyFulfillment.length === 0 ? (
          <p className="mt-4 rounded-lg bg-gray-50 px-4 py-5 text-sm text-gray-600">
            No explicit weekly running-distance target is available yet.
          </p>
        ) : (
          <figure className="mt-4" aria-label="Weekly planned distance target and actual fulfillment percentage">
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 px-3 pb-3 pt-5">
              <div
                className="flex h-64 items-end gap-3 border-b border-gray-300"
                style={{ minWidth: `${Math.max(summary.weeklyFulfillment.length * 88, 560)}px` }}
              >
                {summary.weeklyFulfillment.map((week) => {
                  const actualHeight = week.actualPercent === null
                    ? null
                    : Math.max((week.actualPercent / maximumPercent) * 100, 1.5);
                  const achieved = week.actualPercent !== null && week.actualPercent >= 100;
                  return (
                    <div
                      className="flex h-full min-w-20 flex-1 flex-col justify-end"
                      key={week.weekId}
                      aria-label={`Week ${week.weekNumber}: target 100 percent, actual ${formatPercent(week.actualPercent)}${week.isCurrentWeek ? ", current week" : ""}`}
                    >
                      <div className="flex h-48 items-end justify-center gap-1.5">
                        <div
                          className="w-6 rounded-t bg-blue-200"
                          style={{ height: `${(100 / maximumPercent) * 100}%` }}
                          title="Target: 100%"
                        />
                        {actualHeight === null ? (
                          <div className="flex h-full w-7 items-end justify-center pb-1 text-sm font-bold text-gray-400" title="No recorded distance">—</div>
                        ) : (
                          <div
                            className={`w-6 rounded-t ${achieved ? "bg-emerald-200" : "bg-orange-200"}`}
                            style={{ height: `${actualHeight}%` }}
                            title={`Actual: ${formatPercent(week.actualPercent)}`}
                          />
                        )}
                      </div>
                      <div className="min-h-14 pt-2 text-center">
                        <p className="text-xs font-bold text-gray-900">Week {week.weekNumber}</p>
                        <p className="mt-0.5 text-xs text-gray-600">{formatPercent(week.actualPercent)}</p>
                        {week.isCurrentWeek ? <p className="mt-0.5 text-[11px] font-semibold text-blue-700">Current</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <figcaption className="mt-2 text-xs text-gray-500">
              Target is 100% of each week&apos;s explicit planned running distance. Missing Activity distance remains unavailable rather than zero.
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}
