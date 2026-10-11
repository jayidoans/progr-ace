import Link from "next/link";

import type { RaceResultContext } from "@/src/features/race-results/domain";
import { formatDifferenceText, raceResultStatusLabel } from "@/src/features/race-results/presentation";
import { targetDifferenceSec } from "@/src/features/race-results/domain";
import { formatDuration, formatRaceDate } from "@/src/features/race-goals/format";
import { formatDistanceM, formatDurationSeconds } from "@/src/features/running-analytics/presentation";
import { formatTrainingDate, formatTrainingWeekRange } from "@/src/features/training/format";
import type { CoachProgramReport } from "@/src/features/training-report/domain";
import { PrintProgramReportButton } from "@/src/features/training-report/print-program-report-button";

import styles from "./coach-program-report.module.css";

function formatPercent(value: number | null) {
  return value === null ? "—" : `${Math.round(value)}%`;
}

function OutcomeSummary({ outcomes }: { outcomes: CoachProgramReport["weeks"][number]["outcomes"] }) {
  const entries = Object.entries(outcomes).filter(([, value]) => value > 0);
  return entries.length === 0 ? <span className="text-gray-500">No sessions</span> : <span>{entries.map(([status, value]) => `${status.replaceAll("_", " ")}: ${value}`).join(" · ")}</span>;
}

export function CoachProgramReportView({
  report,
  raceResult,
}: {
  report: CoachProgramReport;
  raceResult: RaceResultContext | null;
}) {
  const { context, summary } = report;
  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className={`flex flex-wrap items-center justify-between gap-3 ${styles.screenOnly}`}>
        <Link className="text-sm font-semibold text-indigo-700" href={`/dashboard/coaching/athletes/${context.athleteId}`}>← Athlete evaluation</Link>
        <PrintProgramReportButton />
      </div>

      <section className={styles.reportSheet}>
        <header className="border-b border-gray-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">ProgrACE · Athlete training report</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">{context.programName}</h1>
          <p className="mt-2 text-gray-700">{context.athleteName} · {context.raceName}</p>
          <p className="mt-1 text-sm text-gray-600">Program schedule · {formatTrainingDate(context.programStartDate)}–{formatTrainingDate(context.programEndDate)} · {context.programStatus}</p>
        </header>

        <section className="mt-6">
          <h2 className="text-lg font-bold text-gray-950">Program fulfillment</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <Metric label="Average weekly fulfillment" value={formatPercent(summary.averageWeeklyFulfillmentPercent)} />
            <Metric label="Total training time" value={formatDurationSeconds(summary.totalClaimedRunningDurationSec)} />
            <Metric label="Total training distance" value={formatDistanceM(summary.totalClaimedRunningDistanceM)} />
          </dl>
          <p className="mt-3 text-sm text-gray-600"><OutcomeSummary outcomes={summary.compliance} /></p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-950">Weekly program schedule and fulfillment</h2>
          <p className="mt-1 text-sm text-gray-600">Each week includes planned running distance, submitted running evidence, session outcomes, and Coach feedback where recorded.</p>
          <div className="mt-4 space-y-4">
            {report.weeks.map((week) => (
              <article className={`rounded-lg border border-gray-200 p-4 ${styles.keepTogether}`} key={week.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-950">Week {week.weekNumber} · {formatTrainingWeekRange(week.startDate, week.endDate)}</h3>
                    <p className="mt-1 text-sm text-gray-600">{week.phase ?? "Training"} · {week.planningStatus}</p>
                  </div>
                  <dl className="grid grid-cols-3 gap-4 text-right text-sm">
                    <div><dt className="text-gray-500">Target</dt><dd className="font-semibold">{formatDistanceM(week.prescribedRunningDistanceM)}</dd></div>
                    <div><dt className="text-gray-500">Actual</dt><dd className="font-semibold">{formatDistanceM(week.actualClaimedRunningDistanceM)}</dd></div>
                    <div><dt className="text-gray-500">Fulfillment</dt><dd className="font-semibold">{formatPercent(week.fulfillmentPercent)}</dd></div>
                  </dl>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-600"><OutcomeSummary outcomes={week.outcomes} /></p>
                <ul className="mt-3 divide-y divide-gray-100 border-y border-gray-100 text-sm">
                  {week.sessions.map((session) => <li className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2" key={session.id}><span><span className="font-semibold">{formatTrainingDate(session.scheduledDate)}</span> · {session.trainingMenu} · {session.title}</span><span className="font-semibold text-gray-600">{session.outcome.replaceAll("_", " ")}</span></li>)}
                </ul>
                {week.fulfillmentRating !== null || week.coachComment ? <div className="mt-4 rounded-md bg-indigo-50 p-3 text-sm"><p className="font-semibold text-indigo-950">Coach note{week.fulfillmentRating !== null ? ` · Fulfillment rating ${week.fulfillmentRating}/10` : ""}</p>{week.coachComment ? <p className="mt-1 whitespace-pre-wrap text-gray-700">{week.coachComment}</p> : <p className="mt-1 text-gray-600">No written comment.</p>}</div> : null}
              </article>
            ))}
          </div>
        </section>

        <section className={`mt-8 border-t border-gray-200 pt-6 ${styles.keepTogether}`}>
          <h2 className="text-lg font-bold text-gray-950">Race result</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-4">
            <Metric label="Race day" value={formatRaceDate(context.raceDate)} />
            <Metric label="Initial target" value={formatDuration(context.targetFinishTimeSec)} />
            <Metric label="Actual" value={raceResult?.status === "FINISHED" && raceResult.finishTimeSec !== null ? formatDuration(raceResult.finishTimeSec) : "—"} />
            <Metric label="Outcome" value={raceResult ? raceResultStatusLabel(raceResult.status) : "Not recorded"} />
          </dl>
          {raceResult ? <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm"><p className="font-semibold text-gray-950">{formatDifferenceText(targetDifferenceSec(raceResult, context.targetFinishTimeSec))}</p>{raceResult.notes ? <p className="mt-2 whitespace-pre-wrap text-gray-700">{raceResult.notes}</p> : null}</div> : null}
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-gray-50 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt><dd className="mt-1 font-bold text-gray-950">{value}</dd></div>;
}
