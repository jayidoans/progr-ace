import Link from "next/link";

import { formatDistance } from "@/src/features/activities/format";
import { EvaluationStateBadge } from "@/src/features/evaluation/components/status-summary";
import type { AthleteEvaluationDashboard } from "@/src/features/evaluation/queries";
import { formatTrainingDate } from "@/src/features/training/format";
import { prescriptionComplianceState } from "@/src/features/evaluation/analytics";
import { AthleteTrainingInsights } from "@/src/features/training-insights/components/athlete-training-insights";
import type { ProgramTrainingInsights } from "@/src/features/training-insights/types";

function firstName(name: string | null | undefined) {
  return name?.trim().split(/\s+/)[0] || "Athlete";
}

function countdownLabel(days: number | null) {
  if (days === null) return null;
  if (days > 0) return `${days} days to race day`;
  if (days === 0) return "Race day is here";
  return `Race was ${Math.abs(days)} days ago`;
}

export function AthleteMobileDashboard({
  data,
  insights,
  readOnly = false,
  surveyAvailable = false,
}: {
  data: AthleteEvaluationDashboard;
  insights: ProgramTrainingInsights | null;
  readOnly?: boolean;
  surveyAvailable?: boolean;
}) {
  const countdown = countdownLabel(data.daysUntilRace);
  const prescriptions = data.currentWeek?.prescriptions ?? [];

  return (
    <div className="space-y-6 pb-24 md:hidden">
      <header className="pt-2">
        <p className="text-sm font-semibold text-emerald-700">ATHLETE HOME</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-gray-950">Hi, {firstName(data.profile?.full_name)}</h1>
        <p className="mt-2 text-sm text-gray-600">Your training, progress, and next action in one place.</p>
      </header>
      {surveyAvailable ? <Link className="rounded-[1.5rem] bg-indigo-50 p-5 text-sm font-extrabold text-indigo-800 ring-1 ring-indigo-100" href="/survey">Research survey is available. Share your ProgrACE experience →</Link> : null}

      {data.activeGoal ? (
        <section className="overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-emerald-100 via-cyan-50 to-indigo-100 p-5 shadow-sm ring-1 ring-emerald-100">
          <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">Current race goal</p>
          <h2 className="mt-2 text-xl font-extrabold leading-tight text-gray-950">{data.activeGoal.race.name}</h2>
          <p className="mt-2 text-sm text-gray-700">{formatTrainingDate(data.activeGoal.race.event_date)}</p>
          <div className="mt-4 flex items-end justify-between gap-3">
            <p className="rounded-full bg-white/75 px-3 py-1.5 text-sm font-bold text-emerald-800">{countdown ?? "Active goal"}</p>
            <Link className="text-sm font-bold text-indigo-700" href="/dashboard/race-goals">View goal →</Link>
          </div>
        </section>
      ) : (
        <section className="rounded-[1.5rem] bg-indigo-50 p-5 ring-1 ring-indigo-100">
          <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">Get started</p>
          <h2 className="mt-2 text-xl font-extrabold text-gray-950">Set your next race goal</h2>
          <Link className="mt-4 inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white" href="/dashboard/race-goals">Add race goal</Link>
        </section>
      )}

      <section className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">This week</p>
            <h2 className="mt-1 text-xl font-extrabold text-gray-950">{data.currentProgram?.name ?? "Your training"}</h2>
            {data.currentWeek ? <p className="mt-1 text-sm text-gray-600">Week {data.currentWeek.week_number}{data.currentWeek.phase ? ` · ${data.currentWeek.phase}` : ""}</p> : null}
          </div>
          {data.currentProgram ? <Link className="rounded-full bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700" href={`/dashboard/training/${data.currentProgram.id}`}>Schedule</Link> : null}
        </div>

        {data.weeklyDistance && !insights ? <div className="mt-4 grid grid-cols-2 gap-3 border-y border-gray-100 py-4">
          <div><p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Target</p><p className="mt-1 text-lg font-extrabold text-gray-950">{data.weeklyDistance.prescribedDistanceM === null ? "—" : formatDistance(data.weeklyDistance.prescribedDistanceM)}</p></div>
          <div><p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Claimed</p><p className="mt-1 text-lg font-extrabold text-emerald-700">{formatDistance(data.weeklyDistance.claimedRunningDistanceM)}</p></div>
        </div> : null}

        {prescriptions.length > 0 ? <ul className="mt-4 space-y-3">
          {prescriptions.map((prescription) => {
            const state = prescriptionComplianceState(prescription, data.today);
            return <li key={prescription.id}>
              <Link className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-100" href={readOnly && data.currentProgram ? `/dashboard/training/${data.currentProgram.id}` : `/dashboard/training/prescriptions/${prescription.id}/claim`}>
                <span className="min-w-0"><span className="block text-[11px] font-extrabold uppercase tracking-wide text-indigo-700">{prescription.training_menu}</span><span className="mt-0.5 block truncate font-bold text-gray-950">{prescription.title}</span><span className="mt-0.5 block text-xs text-gray-500">{formatTrainingDate(prescription.scheduled_date)}</span></span>
                <EvaluationStateBadge state={state} />
              </Link>
            </li>;
          })}
        </ul> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-gray-600">No sessions are scheduled for this calendar week.</p>}
      </section>

      {data.attention.length > 0 ? <section className="rounded-[1.5rem] bg-amber-50 p-5 ring-1 ring-amber-100">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wider text-amber-700">Action needed</p><h2 className="mt-1 text-lg font-extrabold text-gray-950">Complete your training claim</h2></div><span className="rounded-full bg-white px-3 py-1 text-sm font-extrabold text-amber-800">{data.attention.length}</span></div>
        <Link className="mt-4 inline-flex text-sm font-extrabold text-indigo-700" href={data.attention[0].claimId ? `/dashboard/claims/${data.attention[0].claimId}` : readOnly && data.currentProgram ? `/dashboard/training/${data.currentProgram.id}` : `/dashboard/training/prescriptions/${data.attention[0].prescriptionId}/claim`}>Review next action →</Link>
      </section> : null}

      <AthleteTrainingInsights insights={insights} mobile />
    </div>
  );
}
