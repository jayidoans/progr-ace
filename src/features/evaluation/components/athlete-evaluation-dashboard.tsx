import Link from "next/link";

import { formatDistance } from "@/src/features/activities/format";
import {
  EvaluationStateBadge,
  StatusSummary,
} from "@/src/features/evaluation/components/status-summary";
import type { AthleteEvaluationDashboard } from "@/src/features/evaluation/queries";
import { ActiveRaceGoalCard } from "@/src/features/race-goals/components/active-race-goal-card";
import { formatTrainingDate } from "@/src/features/training/format";
import { prescriptionComplianceState } from "@/src/features/evaluation/analytics";

function countdownLabel(days: number | null) {
  if (days === null) return null;
  if (days > 0) return `${days} days until race`;
  if (days === 0) return "Race day";
  return `Race was ${Math.abs(days)} days ago`;
}

export function AthleteEvaluationDashboard({ data }: { data: AthleteEvaluationDashboard }) {
  const countdown = countdownLabel(data.daysUntilRace);
  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950">
          Welcome, {data.profile?.full_name ?? "athlete"}
        </h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          Follow your current training week, submitted evidence, and authoritative Validation results.
        </p>
      </section>

      <div className="space-y-3">
        <ActiveRaceGoalCard goal={data.activeGoal} />
        {countdown ? (
          <p className="rounded-lg bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-800">
            {countdown}
          </p>
        ) : null}
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Current training</p>
            <h2 className="mt-1 text-xl font-bold text-gray-950">
              {data.currentProgram?.name ?? "No current published program"}
            </h2>
          </div>
          {data.currentProgram ? (
            <Link className="text-sm font-semibold text-indigo-700" href={`/dashboard/training/${data.currentProgram.id}`}>
              Open program →
            </Link>
          ) : null}
        </div>
        {data.currentWeek ? (
          <>
            <p className="mt-3 text-sm text-gray-600">
              Week {data.currentWeek.week_number}
              {data.currentWeek.phase ? ` · ${data.currentWeek.phase}` : ""} · {formatTrainingDate(data.currentWeek.start_date)}–{formatTrainingDate(data.currentWeek.end_date)}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {data.currentWeek.prescriptions.map((prescription) => {
                const state = prescriptionComplianceState(prescription, data.today);
                return (
                  <Link
                    className="min-w-0 rounded-lg border border-gray-200 p-4 hover:border-indigo-300"
                    href={`/dashboard/training/prescriptions/${prescription.id}/claim`}
                    key={prescription.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                          {prescription.training_menu.replaceAll("_", " ")}
                        </p>
                        <h3 className="mt-1 break-words font-bold text-gray-950">{prescription.title}</h3>
                        <p className="mt-1 text-sm text-gray-500">{formatTrainingDate(prescription.scheduled_date)}</p>
                      </div>
                      <EvaluationStateBadge state={state} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-gray-600">
            No prescription is scheduled in the current calendar week.
          </p>
        )}
      </section>

      {data.compliance && data.weeklyDistance ? (
        <section className="space-y-5 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-950">This week&apos;s session status</h2>
            <p className="mt-1 text-sm text-gray-600">
              Session counts show how each workout is progressing. They are not a performance score.
            </p>
          </div>
          <StatusSummary counts={data.compliance} />
          <div className="grid gap-3 border-t border-gray-200 pt-5 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Prescribed running distance</p>
              <p className="mt-2 text-2xl font-bold text-gray-950">
                {data.weeklyDistance.prescribedDistanceM === null ? "Not specified" : formatDistance(data.weeklyDistance.prescribedDistanceM)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Claimed running distance</p>
              <p className="mt-2 text-2xl font-bold text-gray-950">{formatDistance(data.weeklyDistance.claimedRunningDistanceM)}</p>
              <p className="mt-1 text-xs text-gray-500">Submitted Claim evidence only</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-950">Needs your attention</h2>
            <Link className="text-sm font-semibold text-indigo-700" href="/dashboard/training">Open training</Link>
          </div>
          {data.attention.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">No current-week items need attention.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.attention.map((item) => (
                <li className="rounded-lg border border-gray-200 p-4" key={item.prescriptionId}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-gray-950">{item.title}</p>
                      <p className="mt-1 text-sm text-gray-500">{formatTrainingDate(item.scheduledDate)}</p>
                    </div>
                    <EvaluationStateBadge state={item.state} />
                  </div>
                  <Link className="mt-3 inline-flex text-sm font-semibold text-indigo-700" href={item.claimId ? `/dashboard/claims/${item.claimId}` : `/dashboard/training/prescriptions/${item.prescriptionId}/claim`}>
                    Review →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
          <h2 className="text-xl font-bold text-gray-950">Recent Validation</h2>
          <p className="mt-1 text-sm text-gray-600">Most recently submitted training results.</p>
          {data.recentValidations.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">No submitted results yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.recentValidations.map((item) => (
                <li className="rounded-lg border border-gray-200 p-4" key={item.claimId}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-gray-950">{item.title}</p>
                      <p className="mt-1 text-sm text-gray-500">{formatTrainingDate(item.scheduledDate)}</p>
                    </div>
                    <EvaluationStateBadge state={item.result} />
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    {item.activityCount} {item.activityCount === 1 ? "activity" : "activities"} · {formatDistance(item.actualDistanceM)}
                    {item.rpeValues.length ? ` · RPE ${item.rpeValues.join(", ")}` : ""}
                  </p>
                  <Link className="mt-3 inline-flex text-sm font-semibold text-indigo-700" href={`/dashboard/claims/${item.claimId}`}>
                    View result →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
