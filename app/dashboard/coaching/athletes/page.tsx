import Link from "next/link";

import { getCoachAthletesProgress } from "@/src/features/evaluation/queries";
import { formatRaceDate } from "@/src/features/race-goals/format";

export default async function CoachAthletesPage() {
  const data = await getCoachAthletesProgress();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Coaching</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950">Athletes</h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          Follow the athletes you coach, their race goals, and the training sessions that need attention.
        </p>
      </header>

      {data.athletes.length === 0 ? (
        <section className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200">
          No athletes are connected to your published training programs yet.
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {data.athletes.map((athlete) => {
            const goal = athlete.goals[0];
            const counts = goal.currentProgram.compliance;
            const attentionCount = counts.NEEDS_REVIEW + counts.MISSED;
            return (
              <article className="min-w-0 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6" key={athlete.athleteId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-lg font-bold text-gray-950">{athlete.athleteName}</h2>
                    <p className="mt-1 break-all text-sm text-gray-500">{athlete.athleteEmail ?? "Email unavailable"}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${goal.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
                    {goal.status}
                  </span>
                </div>
                <div className="mt-5">
                  <p className="font-semibold text-gray-950">{goal.raceName}</p>
                  <p className="mt-1 text-sm text-gray-600">Race date: {formatRaceDate(goal.raceDate)}</p>
                  <p className="mt-1 text-sm text-gray-600">{goal.currentProgram.name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {goal.currentProgram.currentWeekNumber
                      ? `Current published week ${goal.currentProgram.currentWeekNumber}`
                      : "No published session in the current week"}
                  </p>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                  {[
                    ["Verified", counts.VERIFIED],
                    ["Partial", counts.PARTIAL],
                    ["Review", counts.NEEDS_REVIEW],
                    ["Missed", counts.MISSED],
                    ["Upcoming", counts.UPCOMING],
                  ].map(([label, value]) => (
                    <div className="rounded-lg bg-gray-50 p-3" key={label}>
                      <dt className="text-xs text-gray-500">{label}</dt>
                      <dd className="mt-1 font-bold text-gray-950">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className={`text-sm ${attentionCount ? "font-semibold text-amber-700" : "text-gray-600"}`}>
                    {attentionCount ? `${attentionCount} sessions may need attention` : "No review or missed-session follow-up"}
                  </p>
                  <Link className="inline-flex min-h-11 items-center rounded-md border border-blue-300 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50" href={`/dashboard/coaching/athletes/${athlete.athleteId}`}>
                    View Training Progress
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
