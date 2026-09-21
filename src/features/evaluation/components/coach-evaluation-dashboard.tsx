import Link from "next/link";

import { formatDistance } from "@/src/features/activities/format";
import { StatusSummary } from "@/src/features/evaluation/components/status-summary";
import type { CoachEvaluationDashboard } from "@/src/features/evaluation/queries";
import { formatTrainingDate } from "@/src/features/training/format";

export function CoachEvaluationDashboard({ data }: { data: CoachEvaluationDashboard }) {
  const totalSessions = data.programs.reduce((sum, program) => sum + program.prescribedSessions, 0);
  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
          {data.isAdmin ? "Admin evaluation" : "Coach evaluation"}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950">Training overview</h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          See how your athletes are progressing and identify training sessions that may need your attention.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Programs</p>
          <p className="mt-2 text-3xl font-bold text-gray-950">{data.programs.length}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Athletes</p>
          <p className="mt-2 text-3xl font-bold text-gray-950">{data.athletes.length}</p>
        </div>
        <div className="col-span-2 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:col-span-1">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Prescribed sessions</p>
          <p className="mt-2 text-3xl font-bold text-gray-950">{totalSessions}</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-950">Program overview</h2>
            <p className="mt-1 text-sm text-gray-600">Review training progress and completion across each program.</p>
          </div>
          <Link className="text-sm font-semibold text-indigo-700" href="/dashboard/training">Manage training</Link>
        </div>
        {data.programs.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200">No published training programs are available yet.</p>
        ) : (
          <div className="space-y-4">
            {data.programs.map((program) => (
              <article className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6" key={program.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-bold text-gray-950">{program.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">{program.athleteName} · {program.raceName}</p>
                    <p className="mt-1 text-xs text-gray-500">{program.currentWeekNumber ? `Current week ${program.currentWeekNumber}` : "No session in the current week"} · {program.prescribedSessions} sessions</p>
                  </div>
                  <Link className="text-sm font-semibold text-indigo-700" href={`/dashboard/training/${program.id}`}>View program →</Link>
                </div>
                <div className="mt-5"><StatusSummary counts={program.compliance} /></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
        <h2 className="text-xl font-bold text-gray-950">Athlete overview</h2>
        <p className="mt-1 text-sm text-gray-600">See each athlete&apos;s training progress and sessions that may need follow-up.</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {data.athletes.map((athlete) => (
            <article className="min-w-0 rounded-lg border border-gray-200 p-4" key={athlete.athleteId}>
              <h3 className="break-words font-bold text-gray-950">{athlete.athleteName}</h3>
              <p className="mt-1 text-sm text-gray-600">{athlete.raceName ?? "No active race goal"}</p>
              <p className="mt-1 text-xs text-gray-500">{athlete.currentWeekNumber ? `Current week ${athlete.currentWeekNumber}` : "No current week"} · {athlete.programCount} {athlete.programCount === 1 ? "program" : "programs"}</p>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div><dt className="text-gray-500">Verified</dt><dd className="font-bold">{athlete.compliance.VERIFIED}</dd></div>
                <div><dt className="text-gray-500">Partial</dt><dd className="font-bold">{athlete.compliance.PARTIAL}</dd></div>
                <div><dt className="text-gray-500">Review</dt><dd className="font-bold">{athlete.compliance.NEEDS_REVIEW}</dd></div>
                <div><dt className="text-gray-500">Missed</dt><dd className="font-bold">{athlete.compliance.MISSED}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
          <h2 className="text-xl font-bold text-gray-950">Needs review</h2>
          <p className="mt-1 text-sm text-gray-600">Open a session to review its training result.</p>
          {data.needsReview.length === 0 ? <p className="mt-4 text-sm text-gray-600">You&apos;re all caught up. No training sessions need review.</p> : (
            <ul className="mt-4 space-y-3">
              {data.needsReview.map((item) => (
                <li className="rounded-lg border border-gray-200 p-4" key={item.claimId}>
                  <p className="font-semibold text-gray-950">{item.athleteName}</p>
                  <p className="mt-1 break-words text-sm text-gray-700">{item.prescriptionTitle} · {formatTrainingDate(item.scheduledDate)}</p>
                  <p className="mt-1 text-xs text-gray-500">{item.activityCount} {item.activityCount === 1 ? "activity" : "activities"} · {formatDistance(item.actualDistanceM)}</p>
                  <Link className="mt-3 inline-flex text-sm font-semibold text-indigo-700" href={`/dashboard/validation/${item.claimId}`}>Review Validation →</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
          <h2 className="text-xl font-bold text-gray-950">Missed training</h2>
          <p className="mt-1 text-sm text-gray-600">Past workouts without a submitted training session. Today&apos;s workout is still open.</p>
          {data.missed.length === 0 ? <p className="mt-4 text-sm text-gray-600">No missed training sessions in this view.</p> : (
            <ul className="mt-4 space-y-3">
              {data.missed.map((item) => (
                <li className="rounded-lg border border-gray-200 p-4" key={`${item.programId}-${item.prescriptionTitle}-${item.scheduledDate}`}>
                  <p className="font-semibold text-gray-950">{item.athleteName}</p>
                  <p className="mt-1 break-words text-sm text-gray-700">{item.prescriptionTitle} · {formatTrainingDate(item.scheduledDate)}</p>
                  <Link className="mt-3 inline-flex text-sm font-semibold text-indigo-700" href={`/dashboard/training/${item.programId}`}>Open program →</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
