"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ComplianceCounts } from "@/src/features/evaluation/analytics";
import type { ProgramRunningAnalytics, RunningSessionTrend, WeeklyRunningAnalytics } from "@/src/features/running-analytics/domain";
import { filterLabel, filterRunningSessions, formatDistanceM, formatDurationSeconds, formatPaceSecondsPerKm, RUNNING_MENU_FILTERS, summarizeRunningAnalytics, type RunningMenuFilter } from "@/src/features/running-analytics/presentation";
import { formatTrainingDate, formatTrainingWeekRange } from "@/src/features/training/format";

const outcomeLabels: (keyof ComplianceCounts)[] = ["VERIFIED", "PARTIAL", "NEEDS_REVIEW", "REJECTED", "MISSED", "NOT_CLAIMED", "UPCOMING"];
const outcomeTone: Record<keyof ComplianceCounts, string> = {
  VERIFIED: "bg-emerald-500", PARTIAL: "bg-amber-400", NEEDS_REVIEW: "bg-blue-500", REJECTED: "bg-red-400", MISSED: "bg-gray-500", NOT_CLAIMED: "bg-slate-300", UPCOMING: "bg-indigo-400", DRAFT: "bg-slate-300", SUBMITTED: "bg-indigo-300",
};

function OutcomeRow({ week }: { week: WeeklyRunningAnalytics }) {
  const total = Object.values(week.outcomes).reduce((sum, value) => sum + value, 0);
  return <div className="rounded-lg border border-gray-200 p-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span className="font-semibold">Week {week.weekNumber}</span><span className="text-gray-500">{total} sessions</span></div>
    <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-gray-100" aria-label={`Week ${week.weekNumber} session outcomes`}>
      {outcomeLabels.map((state) => week.outcomes[state] > 0 ? <span className={outcomeTone[state]} key={state} style={{ width: `${(week.outcomes[state] / Math.max(total, 1)) * 100}%` }} title={`${state}: ${week.outcomes[state]}`} /> : null)}
    </div>
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
      {outcomeLabels.map((state) => week.outcomes[state] > 0 ? <span key={state}><span className={`mr-1 inline-block h-2 w-2 rounded-full ${outcomeTone[state]}`} />{state.replaceAll("_", " ")} {week.outcomes[state]}</span> : null)}
    </div>
  </div>;
}

function TrendCard({ session }: { session: RunningSessionTrend }) {
  const multipleActivities = session.runningActivities.length > 1;
  return <article className="rounded-xl border border-gray-200 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Week {session.weekNumber} · {formatTrainingDate(session.scheduledDate)}</p><h3 className="mt-1 font-bold text-gray-950">{session.title}</h3><p className="mt-1 text-sm text-gray-600">{session.trainingMenu}{session.phase ? ` · ${session.phase}` : ""}</p></div>
      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">{session.outcome.replaceAll("_", " ")}</span>
    </div>
    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <div><dt className="text-gray-500">Distance</dt><dd className="font-semibold">{formatDistanceM(session.actualRunningDistanceM)}</dd></div>
      <div><dt className="text-gray-500">Duration</dt><dd className="font-semibold">{formatDurationSeconds(session.actualRunningDurationSec)}</dd></div>
      <div><dt className="text-gray-500">{session.trainingMenu === "SPEED" ? "Whole-session pace" : "Pace"}</dt><dd className="font-semibold">{formatPaceSecondsPerKm(session.wholeSessionPaceSecPerKm)}</dd></div>
      <div><dt className="text-gray-500">HR / RPE</dt><dd className="font-semibold">{session.singleActivityAverageHrBpm === null ? "—" : `${session.singleActivityAverageHrBpm} bpm`} <span className="font-normal text-gray-400">·</span> {session.singleActivityRpe === null ? "—" : `RPE ${session.singleActivityRpe}`}</dd></div>
    </dl>
    {multipleActivities ? <details className="mt-4 rounded-lg bg-gray-50 p-3 text-sm"><summary className="cursor-pointer font-semibold">{session.runningActivities.length} activities · view activity details</summary><ul className="mt-3 space-y-2">{session.runningActivities.map((activity) => <li className="flex flex-wrap justify-between gap-2 border-t border-gray-200 pt-2" key={activity.id}><span>{activity.name}</span><span className="text-gray-600">{formatDistanceM(activity.distance_m)} · {activity.average_hr_bpm === null ? "—" : `${activity.average_hr_bpm} bpm`} · {activity.rpe === null ? "—" : `RPE ${activity.rpe}`}</span></li>)}</ul></details> : null}
  </article>;
}

export function RunningProgressView({ data }: { data: ProgramRunningAnalytics }) {
  const [filter, setFilter] = useState<RunningMenuFilter>("ALL");
  const summary = summarizeRunningAnalytics(data);
  const sessions = useMemo(() => filterRunningSessions(data.sessions, filter), [data.sessions, filter]);
  const hasPublished = data.weeks.length > 0;
  return <div className="space-y-8">
    <header className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-7"><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Training Progress</p><h1 className="mt-2 break-words text-3xl font-bold text-gray-950">{data.context.programName}</h1><p className="mt-2 text-gray-600">{data.context.athleteName} · {data.context.raceName}</p><p className="mt-1 text-sm text-gray-500">Race day · {formatTrainingDate(data.context.raceDate)} · {data.context.currentWeekNumber ? `Week ${data.context.currentWeekNumber}` : "Program history"}</p>{data.context.programCancelledAt ? <p className="mt-4 rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">This program ended on {formatTrainingDate(data.context.programCancelledAt.slice(0, 10))}. Training progress remains available as history.</p> : null}</header>
    {!hasPublished ? <section className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200">No published training sessions yet.</section> : <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Planned running distance" value={formatDistanceM(summary.plannedDistanceM)} /><Metric label="Completed running distance" value={formatDistanceM(summary.completedDistanceM)} /><Metric label="Published sessions" value={String(summary.publishedSessions)} /><Metric label="Missed sessions" value={String(summary.missedSessions)} /></section>
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6"><SectionHeading title="Weekly Running Distance" description="Explicit planned distance and submitted running evidence by published week." /><div className="mt-5 space-y-3">{data.weeks.map((week) => <div className={`rounded-lg border p-3 ${week.isCurrentWeek ? "border-indigo-300 bg-indigo-50/50" : "border-gray-200"}`} key={week.weekId}><div className="flex flex-wrap justify-between gap-2 text-sm"><div><span className="font-bold">Week {week.weekNumber}</span>{week.isCurrentWeek ? <span className="ml-2 rounded-full bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-700">Current week</span> : null}{week.phase ? <span className="ml-2 text-gray-500">{week.phase}</span> : null}<p className="mt-1 text-xs text-gray-500">{formatTrainingWeekRange(week.startDate, week.endDate)}</p></div><div className="text-right"><p>Planned <strong>{formatDistanceM(week.prescribedRunningDistanceM)}</strong></p><p>Completed <strong>{formatDistanceM(week.actualClaimedRunningDistanceM)}</strong></p></div></div>{week.durationOnlyRunningPrescriptionCount > 0 ? <p className="mt-2 text-xs text-gray-500">{week.durationOnlyRunningPrescriptionCount} running session{week.durationOnlyRunningPrescriptionCount === 1 ? "" : "s"} has no distance target.</p> : null}</div>)}</div></section>
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6"><SectionHeading title="Session Outcomes" description="Existing training outcome states by published week." /><div className="mt-5 grid gap-3 md:grid-cols-2">{data.weeks.map((week) => <OutcomeRow key={week.weekId} week={week} />)}</div></section>
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><SectionHeading title="Running Trend" description="Observed running sessions linked through submitted Claims." /><div className="flex flex-wrap gap-2" aria-label="Running menu filter">{RUNNING_MENU_FILTERS.map((option) => <button className={`min-h-10 rounded-md border px-3 text-sm font-semibold ${filter === option ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`} key={option} onClick={() => setFilter(option)} type="button" aria-pressed={filter === option}>{filterLabel(option)}</button>)}</div></div><div className="mt-5 space-y-3">{sessions.length === 0 ? <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">No {filter === "ALL" ? "running" : filterLabel(filter)} training has been recorded for this program yet.</p> : sessions.map((session) => <TrendCard key={session.prescriptionId} session={session} />)}</div></section>
    </>}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-gray-950">{value}</p></div>; }
function SectionHeading({ title, description }: { title: string; description: string }) { return <div><h2 className="text-xl font-bold text-gray-950">{title}</h2><p className="mt-1 text-sm text-gray-600">{description}</p></div>; }

export function TrainingProgressLink({ programId }: { programId: string }) { return <Link className="inline-flex min-h-11 items-center rounded-md border border-indigo-300 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-50" href={`/dashboard/training/${programId}/progress`}>Training Progress</Link>; }
