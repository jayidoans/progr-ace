import Link from "next/link";
import Image from "next/image";

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

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateForDay(startDate: string, offset: number) {
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function WeeklyFulfillmentChart({ weeks }: { weeks: CoachProgramReport["weeks"] }) {
  const maximumDistance = Math.max(
    1,
    ...weeks.flatMap((week) => [week.prescribedRunningDistanceM ?? 0, week.actualClaimedRunningDistanceM ?? 0]),
  );

  return (
    <section className={styles.fulfillmentChart} aria-labelledby="fulfillment-chart-title">
      <div className={styles.chartHeading}>
        <div>
          <p className={styles.eyebrow}>Training overview</p>
          <h2 id="fulfillment-chart-title">Weekly distance fulfillment</h2>
        </div>
        <div className={styles.chartLegend} aria-label="Chart legend">
          <span><i className={styles.targetLegend} /> Target</span>
          <span><i className={styles.reachedLegend} /> Actual: target reached</span>
          <span><i className={styles.belowLegend} /> Actual: below target</span>
        </div>
      </div>
      <div className={styles.chartBars}>
        {weeks.map((week) => {
          const actual = week.actualClaimedRunningDistanceM;
          const target = week.prescribedRunningDistanceM;
          const actualReachedTarget = actual !== null && target !== null && actual >= target;
          return (
            <div className={styles.chartWeek} key={week.id}>
              <div className={styles.barArea} aria-label={`Week ${week.weekNumber}: ${formatPercent(week.fulfillmentPercent)} fulfillment`}>
                <span
                  className={`${styles.chartBar} ${styles.targetBar}`}
                  style={{ height: `${target === null ? 0 : Math.max(4, (target / maximumDistance) * 100)}%` }}
                />
                {actual !== null ? <span
                  className={`${styles.chartBar} ${actualReachedTarget ? styles.reachedBar : styles.belowBar}`}
                  style={{ height: `${Math.max(4, (actual / maximumDistance) * 100)}%` }}
                /> : <span className={styles.noActual}>—</span>}
              </div>
              <strong>Week {week.weekNumber}</strong>
              <span>{formatPercent(week.fulfillmentPercent)}</span>
            </div>
          );
        })}
      </div>
      <p className={styles.chartCaption}>Target is each week&apos;s planned running distance. Actual distance is based on submitted running Activities.</p>
    </section>
  );
}

function WeeklyScheduleCards({ week }: { week: CoachProgramReport["weeks"][number] }) {
  const sessionsByDate = new Map(week.sessions.map((session) => [session.scheduledDate, session]));
  return (
    <div className={styles.weekDayGrid}>
      {Array.from({ length: 7 }, (_, offset) => {
        const scheduledDate = dateForDay(week.startDate, offset);
        const session = sessionsByDate.get(scheduledDate);
        const date = new Date(`${scheduledDate}T00:00:00Z`);
        return (
          <div className={styles.dayCard} key={scheduledDate}>
            <div className={styles.dayHeading}><span>{DAY_LABELS[date.getUTCDay()]}</span><time dateTime={scheduledDate}>{date.getUTCDate()}</time></div>
            {session ? <>
              <span className={styles.menuBadge}>{session.trainingMenu}</span>
              <p className={styles.sessionTitle}>{session.title}</p>
              <p className={`${styles.outcomeBadge} ${styles[`outcome${session.outcome.replaceAll("_", "")}`] ?? ""}`}>{session.outcome.replaceAll("_", " ")}</p>
            </> : <p className={styles.restDay}>Rest day</p>}
          </div>
        );
      })}
    </div>
  );
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
        <header className={styles.reportHeader}>
          <div>
            <p className={styles.eyebrow}>Athlete training report</p>
            <h1>{context.programName}</h1>
            <p className={styles.reportAthlete}>{context.athleteName} · {context.raceName}</p>
            <p className={styles.reportMeta}>Program schedule · {formatTrainingDate(context.programStartDate)}–{formatTrainingDate(context.programEndDate)} · {context.programStatus}</p>
          </div>
          <Image
            alt="ProgrACE"
            className={styles.reportLogo}
            height={50}
            priority
            src="/prograce-logo.png"
            width={150}
          />
        </header>

        <section className={styles.summarySection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Program fulfillment</p>
              <h2>Training at a glance</h2>
            </div>
            <p className={styles.outcomeSummary}><OutcomeSummary outcomes={summary.compliance} /></p>
          </div>
          <dl className={styles.metricGrid}>
            <Metric accent="blue" label="Average weekly fulfillment" value={formatPercent(summary.averageWeeklyFulfillmentPercent)} />
            <Metric accent="green" label="Total training time" value={formatDurationSeconds(summary.totalClaimedRunningDurationSec)} />
            <Metric accent="purple" label="Total training distance" value={formatDistanceM(summary.totalClaimedRunningDistanceM)} />
          </dl>
          <WeeklyFulfillmentChart weeks={report.weeks} />
        </section>

        <section className={styles.weeklySection}>
          <p className={styles.eyebrow}>Full schedule</p>
          <h2>Weekly program schedule and fulfillment</h2>
          <p className={styles.sectionDescription}>Each week includes planned running distance, submitted running evidence, session outcomes, and Coach feedback where recorded.</p>
          <div className={styles.weekList}>
            {report.weeks.map((week) => (
              <article className={`${styles.weekCard} ${styles.keepTogether}`} key={week.id}>
                <div className={styles.weekCardHeader}>
                  <div>
                    <h3>Week {week.weekNumber} · {formatTrainingWeekRange(week.startDate, week.endDate)}</h3>
                    <p>{week.phase ?? "Training"} · <span className={styles.planningStatus}>{week.planningStatus}</span></p>
                  </div>
                  <dl className={styles.weekMetrics}>
                    <div><dt>Target</dt><dd>{formatDistanceM(week.prescribedRunningDistanceM)}</dd></div>
                    <div><dt>Actual</dt><dd>{formatDistanceM(week.actualClaimedRunningDistanceM)}</dd></div>
                    <div><dt>Fulfillment</dt><dd>{formatPercent(week.fulfillmentPercent)}</dd></div>
                  </dl>
                </div>
                <p className={styles.weekOutcomes}><OutcomeSummary outcomes={week.outcomes} /></p>
                <WeeklyScheduleCards week={week} />
                {week.fulfillmentRating !== null || week.coachComment ? <div className={styles.coachNote}><p>Coach note{week.fulfillmentRating !== null ? ` · Fulfillment rating ${week.fulfillmentRating}/10` : ""}</p>{week.coachComment ? <p className={styles.coachComment}>{week.coachComment}</p> : <p className={styles.noComment}>No written comment.</p>}</div> : null}
              </article>
            ))}
          </div>
        </section>

        <section className={`mt-8 border-t border-gray-200 pt-6 ${styles.keepTogether}`}>
          <h2 className="text-lg font-bold text-gray-950">Race result</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-4">
            <Metric accent="blue" label="Race day" value={formatRaceDate(context.raceDate)} />
            <Metric accent="green" label="Initial target" value={formatDuration(context.targetFinishTimeSec)} />
            <Metric accent="purple" label="Actual" value={raceResult?.status === "FINISHED" && raceResult.finishTimeSec !== null ? formatDuration(raceResult.finishTimeSec) : "—"} />
            <Metric accent="blue" label="Outcome" value={raceResult ? raceResultStatusLabel(raceResult.status) : "Not recorded"} />
          </dl>
          {raceResult ? <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm"><p className="font-semibold text-gray-950">{formatDifferenceText(targetDifferenceSec(raceResult, context.targetFinishTimeSec))}</p>{raceResult.notes ? <p className="mt-2 whitespace-pre-wrap text-gray-700">{raceResult.notes}</p> : null}</div> : null}
        </section>
      </section>
      <footer className={styles.printFooter} aria-hidden="true">
        <Image alt="" className={styles.footerLogo} height={22} src="/prograce-logo.png" width={66} />
        <span>{context.programName} · {context.athleteName}</span>
      </footer>
    </main>
  );
}

function Metric({ accent, label, value }: { accent: "blue" | "green" | "purple"; label: string; value: string }) {
  return <div className={`${styles.metric} ${styles[`metric${accent}`]}`}><dt>{label}</dt><dd>{value}</dd></div>;
}
