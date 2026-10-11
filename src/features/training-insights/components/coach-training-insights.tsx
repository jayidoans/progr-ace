import Link from "next/link";

import { summarizeCoachTrainingInsights } from "@/src/features/training-insights/coach-presentation";
import { canShowDistanceRatio, presentDistanceCoverage } from "@/src/features/training-insights/presentation";
import type { CoachTrainingInsightsSummary, ProgramTrainingInsights } from "@/src/features/training-insights/types";

function CompactTrend({ summary }: { summary: CoachTrainingInsightsSummary }) {
  if (summary.trend.length === 0) return <p className="mt-3 text-xs text-gray-500">No published recent weeks.</p>;
  return (
    <ul className="mt-3 grid grid-cols-4 gap-2" aria-label={`Four-week distance trend for ${summary.athlete.name ?? "athlete"}`}>
      {summary.trend.map((week) => {
        const planned = presentDistanceCoverage(week.plannedDistance);
        const actual = presentDistanceCoverage(week.actualDistance);
        const ratio = canShowDistanceRatio(week.plannedDistance, week.actualDistance)
          && week.plannedDistance.value !== null && week.actualDistance.value !== null
          ? `${Math.round((week.actualDistance.value / week.plannedDistance.value) * 100)}%`
          : actual.detail;
        return (
          <li className="min-w-0 rounded-lg bg-slate-50 p-2" key={week.startDate}>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-700">{week.startDate.slice(5)}</p>
            <p className="mt-1 truncate text-xs font-bold text-gray-950">{planned.value}</p>
            <p className="mt-0.5 truncate text-xs font-bold text-emerald-700">{actual.value}</p>
            <p className="mt-1 truncate text-[10px] text-gray-500">{ratio}</p>
          </li>
        );
      })}
    </ul>
  );
}

export function CoachTrainingInsightsOverview({
  summaries,
  hasMore,
}: {
  summaries: CoachTrainingInsightsSummary[];
  hasMore: boolean;
}) {
  const overview = summarizeCoachTrainingInsights(summaries);
  return (
    <section className="space-y-5 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Training insights</p>
          <h2 className="mt-1 text-xl font-bold text-gray-950">Current-week follow-up</h2>
          <p className="mt-1 text-sm text-gray-600">A bounded view of current published training and submitted running evidence.</p>
        </div>
        <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700" href="/dashboard/coaching/athletes">Athletes →</Link>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Programs shown", overview.programsShown],
          ["Athletes represented", overview.athletesRepresented],
          ["Needs review", overview.needsReview],
          ["Missed", overview.missed],
          ["Follow-up", overview.athletesRequiringFollowUp],
        ].map(([label, value]) => (
          <div className="rounded-lg bg-slate-50 p-3" key={label}>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className="mt-1 text-2xl font-bold text-gray-950">{value}</dd>
          </div>
        ))}
      </dl>

      {hasMore ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Showing the most recent bounded Program set. Additional Programs exist and are not included in these counts.</p> : null}

      {summaries.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-gray-600">No published Programs are available for Training Insights.</p> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {summaries.map((summary) => {
            const current = summary.currentWeek;
            return (
              <article className="min-w-0 rounded-lg border border-gray-200 p-4" key={summary.program.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-bold text-gray-950">{summary.athlete.name ?? "Athlete"}</h3>
                    <p className="mt-1 break-words text-sm text-gray-600">{summary.program.name}</p>
                  </div>
                  <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700" href={`/dashboard/coaching/athletes/${summary.athlete.id}`}>View →</Link>
                </div>
                {current ? <p className="mt-3 text-sm font-semibold text-gray-700">Week {current.weekNumber} · {current.needsReviewCount} review · {current.missedCount} missed</p> : <p className="mt-3 text-sm text-gray-600">No published session in the current week.</p>}
                <CompactTrend summary={summary} />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function CoachProgramTrainingInsights({ insights }: { insights: ProgramTrainingInsights }) {
  const current = insights.currentWeek;
  const planned = current ? presentDistanceCoverage(current.plannedDistance) : null;
  const actual = current ? presentDistanceCoverage(current.actualDistance) : null;
  return (
    <section className="mt-6 border-t border-gray-200 pt-6" aria-labelledby={`coach-training-insights-${insights.program.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Training insights</p>
          <h3 className="mt-1 text-lg font-bold text-gray-950" id={`coach-training-insights-${insights.program.id}`}>Current-week running distance</h3>
        </div>
        <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700" href={`/dashboard/training/${insights.program.id}/progress`}>Training progress →</Link>
      </div>
      {current && planned && actual ? <>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-indigo-50 p-4"><dt className="text-xs font-bold uppercase tracking-wide text-indigo-700">Planned</dt><dd className="mt-1 text-2xl font-bold text-gray-950">{planned.value}</dd><p className="mt-1 text-xs text-gray-600">{planned.detail}</p></div>
          <div className="rounded-lg bg-emerald-50 p-4"><dt className="text-xs font-bold uppercase tracking-wide text-emerald-700">Recorded</dt><dd className="mt-1 text-2xl font-bold text-gray-950">{actual.value}</dd><p className="mt-1 text-xs text-gray-600">{actual.detail}</p></div>
        </dl>
        <p className="mt-3 text-sm font-semibold text-gray-700">{current.needsReviewCount} needs review · {current.missedCount} missed</p>
      </> : <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-gray-600">No published session is scheduled in the current UTC calendar week.</p>}
    </section>
  );
}
