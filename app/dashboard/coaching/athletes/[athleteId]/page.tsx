import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusSummary } from "@/src/features/evaluation/components/status-summary";
import { getCoachAthletesProgress } from "@/src/features/evaluation/queries";
import { completeCoachedRaceGoal } from "@/src/features/race-goals/actions";
import { canOfferRaceGoalCompletion } from "@/src/features/race-goals/completion";
import { formatDuration, formatRaceDate } from "@/src/features/race-goals/format";
import { formatTrainingDate } from "@/src/features/training/format";

const messages: Record<string, string> = {
  "goal-completed": "The race goal is completed. Training history remains available.",
};

const errors: Record<string, string> = {
  "invalid-goal": "The race goal could not be identified.",
  "race-not-finished": "This race goal can be completed on or after race day.",
  "completion-failed": "The race goal could not be completed. Check your access and try again.",
};

export default async function CoachAthleteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ athleteId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [{ athleteId }, query] = await Promise.all([params, searchParams]);
  const data = await getCoachAthletesProgress(athleteId);
  const athlete = data.athletes.find((item) => item.athleteId === athleteId);
  if (!athlete) notFound();

  return (
    <div className="space-y-8">
      <Link className="text-sm font-semibold text-blue-700" href="/dashboard/coaching/athletes">← Athletes</Link>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Athlete progress</p>
        <h1 className="mt-2 break-words text-3xl font-bold text-gray-950">{athlete.athleteName}</h1>
        <p className="mt-2 break-all text-sm text-gray-600">{athlete.athleteEmail ?? "Email unavailable"}</p>
      </header>

      {query.message && messages[query.message] ? <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{messages[query.message]}</p> : null}
      {query.error && errors[query.error] ? <p className="rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">{errors[query.error]}</p> : null}

      {athlete.goals.map((goal) => {
        const canComplete = canOfferRaceGoalCompletion(goal.status, goal.raceDate, data.today);
        return (
          <article className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6" key={goal.goalId}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-xl font-bold text-gray-950">{goal.raceName}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${goal.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>{goal.status}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">Race date: {formatRaceDate(goal.raceDate)}</p>
                <p className="mt-1 text-sm text-gray-600">Target finish: {formatDuration(goal.targetFinishTimeSec)}</p>
                {goal.completedAt ? <p className="mt-1 text-xs text-gray-500">Completed {new Date(goal.completedAt).toLocaleString("en-GB")}</p> : null}
              </div>
              {canComplete ? (
                <details className="w-full rounded-lg border border-emerald-200 p-4 text-sm sm:w-auto sm:max-w-sm">
                  <summary className="cursor-pointer font-semibold text-emerald-700">Mark as Completed</summary>
                  <p className="mt-3 text-gray-600">
                    This closes the athlete&apos;s active race goal. Training history, activities, claims, and validation results will remain available.
                  </p>
                  <form action={completeCoachedRaceGoal} className="mt-4 flex flex-wrap gap-3">
                    <input name="athleteId" type="hidden" value={athlete.athleteId} />
                    <input name="goalId" type="hidden" value={goal.goalId} />
                    <button className="min-h-11 rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700" type="submit">Mark as Completed</button>
                  </form>
                </details>
              ) : goal.status === "ACTIVE" ? (
                <p className="max-w-xs text-sm text-gray-600">Completion becomes available on race day.</p>
              ) : null}
            </div>

            <section className="mt-6 border-t border-gray-200 pt-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-950">{goal.currentProgram.name}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {goal.currentProgram.currentWeekNumber
                      ? `Current published week ${goal.currentProgram.currentWeekNumber}`
                      : "No published session in the current week"}
                    {goal.programCount > 1 ? ` · ${goal.programCount} published programs for this goal` : ""}
                  </p>
                </div>
                <Link className="inline-flex min-h-11 items-center rounded-md border border-blue-300 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50" href={`/dashboard/training/${goal.currentProgram.id}`}>Open Training Program</Link>
              </div>
              <div className="mt-5"><StatusSummary counts={goal.currentProgram.compliance} /></div>
            </section>

            <div className="mt-6 grid gap-5 border-t border-gray-200 pt-6 lg:grid-cols-2">
              <section>
                <h3 className="font-bold text-gray-950">Needs review</h3>
                {goal.needsReview.length === 0 ? <p className="mt-2 text-sm text-gray-600">No training sessions are waiting for review.</p> : <ul className="mt-3 space-y-2">{goal.needsReview.map((item) => <li className="rounded-lg bg-blue-50 p-3 text-sm" key={item.claimId}><p className="font-semibold">{item.prescriptionTitle}</p><p className="mt-1 text-gray-600">{formatTrainingDate(item.scheduledDate)}</p><Link className="mt-2 inline-flex font-semibold text-blue-700" href={`/dashboard/validation/${item.claimId}`}>Review Validation →</Link></li>)}</ul>}
              </section>
              <section>
                <h3 className="font-bold text-gray-950">Missed training</h3>
                {goal.missed.length === 0 ? <p className="mt-2 text-sm text-gray-600">No missed training sessions in this program view.</p> : <ul className="mt-3 space-y-2">{goal.missed.map((item) => <li className="rounded-lg bg-gray-50 p-3 text-sm" key={`${item.programId}-${item.prescriptionTitle}-${item.scheduledDate}`}><p className="font-semibold">{item.prescriptionTitle}</p><p className="mt-1 text-gray-600">{formatTrainingDate(item.scheduledDate)}</p></li>)}</ul>}
              </section>
            </div>
          </article>
        );
      })}
    </div>
  );
}
