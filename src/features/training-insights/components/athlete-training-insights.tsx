import Link from "next/link";

import type { ProgramTrainingInsights, TrainingInsightWeek } from "@/src/features/training-insights/types";
import { canShowDistanceRatio, presentDistanceCoverage } from "@/src/features/training-insights/presentation";

function TrendBar({ week, maximum }: { week: TrainingInsightWeek; maximum: number }) {
  const planned = presentDistanceCoverage(week.plannedDistance);
  const actual = presentDistanceCoverage(week.actualDistance);
  const width = (value: number | null) => value === null || value === 0
    ? 0
    : Math.max(8, (value / maximum) * 100);
  const plannedWidth = width(week.plannedDistance.value);
  const actualWidth = width(week.actualDistance.value);
  const canShowRatio = canShowDistanceRatio(week.plannedDistance, week.actualDistance);
  const ratio = canShowRatio && week.plannedDistance.value !== null && week.actualDistance.value !== null
    ? Math.round((week.actualDistance.value / week.plannedDistance.value) * 100)
    : null;

  return (
    <li className="min-w-0 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-indigo-700">Week {week.weekNumber}</p>
      <div aria-label={`Week ${week.weekNumber} planned distance`} className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-100">
        <div className="h-full rounded-full bg-indigo-400" style={{ width: `${plannedWidth}%` }} />
      </div>
      <div aria-label={`Week ${week.weekNumber} recorded distance`} className="mt-1.5 h-2 overflow-hidden rounded-full bg-emerald-100">
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${actualWidth}%` }} />
      </div>
      <p className="mt-3 truncate text-xs font-bold text-gray-950">{planned.value}</p>
      <p className="mt-0.5 truncate text-xs font-bold text-emerald-700">{actual.value}</p>
      <p className="mt-1 text-[11px] text-gray-500">{ratio === null ? actual.detail : `${ratio}% of planned`}</p>
    </li>
  );
}

export function AthleteTrainingInsights({
  insights,
  mobile = false,
}: {
  insights: ProgramTrainingInsights | null;
  mobile?: boolean;
}) {
  if (!insights) {
    return (
      <section className="rounded-[1.5rem] bg-slate-50 p-5 ring-1 ring-slate-200">
        <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">Training insights</p>
        <h2 className="mt-1 text-lg font-extrabold text-gray-950">No current training insights</h2>
        <p className="mt-2 text-sm text-gray-600">Insights appear when a published program has a current training week.</p>
        <Link className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-indigo-700" href="/dashboard/training">Open training →</Link>
      </section>
    );
  }

  const currentWeek = insights.currentWeek;
  const maximum = Math.max(
    1,
    ...insights.fourWeekTrend.flatMap((week) => [week.plannedDistance.value ?? 0, week.actualDistance.value ?? 0]),
  );
  const planned = currentWeek ? presentDistanceCoverage(currentWeek.plannedDistance) : null;
  const actual = currentWeek ? presentDistanceCoverage(currentWeek.actualDistance) : null;
  const compactClass = mobile ? "rounded-[1.5rem] p-5" : "rounded-xl p-5 sm:p-6";

  return (
    <section className={`bg-white shadow-sm ring-1 ring-gray-200 ${compactClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">Training insights</p>
          <h2 className="mt-1 text-xl font-extrabold text-gray-950">{insights.program.name}</h2>
          <p className="mt-1 text-sm text-gray-600">Published sessions and submitted running evidence.</p>
        </div>
        <Link className="inline-flex min-h-11 items-center rounded-full bg-indigo-50 px-3 text-sm font-bold text-indigo-700" href={`/dashboard/training/${insights.program.id}`}>
          Program
        </Link>
      </div>

      {currentWeek && planned && actual ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 border-y border-gray-100 py-4">
            <div className="rounded-xl bg-indigo-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">Planned distance</p>
              <p className="mt-1 text-xl font-extrabold text-gray-950">{planned.value}</p>
              <p className="mt-1 text-xs text-gray-600">{planned.detail}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Recorded distance</p>
              <p className="mt-1 text-xl font-extrabold text-gray-950">{actual.value}</p>
              <p className="mt-1 text-xs text-gray-600">{actual.detail}</p>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-gray-700">
            {currentWeek.needsReviewCount > 0
              ? `${currentWeek.needsReviewCount} session${currentWeek.needsReviewCount === 1 ? "" : "s"} needs review.`
              : currentWeek.missedCount > 0
                ? `${currentWeek.missedCount} missed session${currentWeek.missedCount === 1 ? "" : "s"}.`
                : "No current sessions need review."}
          </p>
        </>
      ) : (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-gray-600">No published sessions are scheduled in this UTC calendar week.</p>
      )}

      {insights.fourWeekTrend.length > 0 ? (
        <div className="mt-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-950">Four-week running distance</h3>
              <p className="mt-1 text-xs text-gray-500">Purple: planned · Green: recorded</p>
            </div>
            <Link className="inline-flex min-h-11 items-center text-sm font-bold text-indigo-700" href={`/dashboard/training/${insights.program.id}/progress`}>
              Progress →
            </Link>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {insights.fourWeekTrend.map((week) => <TrendBar key={week.id} maximum={maximum} week={week} />)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
