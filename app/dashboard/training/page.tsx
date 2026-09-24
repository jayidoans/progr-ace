import Link from "next/link";

import { TrainingImportForm } from "@/src/features/training-import/components";
import { formatTrainingDate } from "@/src/features/training/format";
import { getTrainingDashboardData } from "@/src/features/training/queries";

const errors: Record<string, string> = {
  "invalid-import": "Choose a program, race goal, and XLSX file.",
  "unsafe-workbook": "The workbook failed XLSX security validation.",
  "parse-failed": "The workbook contains import errors.",
  "preview-create-failed": "The import preview could not be saved.",
  "invalid-program": "The program could not be found.",
};

const messages: Record<string, string> = {
  "draft-deleted": "Draft training program deleted.",
};

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; detail?: string; message?: string }>;
}) {
  const [data, params] = await Promise.all([getTrainingDashboardData(), searchParams]);
  const activeGoals = data.raceGoals.filter((goal) => goal.status === "ACTIVE");
  const activeProgramByGoal = new Map<string, (typeof data.programs)[number]>();
  data.programs
    .filter((program) => program.status === "PUBLISHED")
    .sort((a, b) => b.start_date.localeCompare(a.start_date))
    .forEach((program) => {
      if (!activeProgramByGoal.has(program.race_goal.id)) {
        activeProgramByGoal.set(program.race_goal.id, program);
      }
    });
  activeGoals.sort((a, b) => Number(activeProgramByGoal.has(a.id)) - Number(activeProgramByGoal.has(b.id)));
  const visiblePrograms = data.isAuthor
    ? data.programs.filter((program) => program.created_by === data.userId)
    : data.programs;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Training</p>
          <h1 className="mt-2 text-3xl font-bold">Training programs</h1>
          <p className="mt-3 max-w-2xl text-gray-600">Create and manage structured training plans to guide athletes toward their race goals.</p>
        </div>
        {data.isAuthor ? <div className="flex flex-wrap gap-3"><Link className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" href="/dashboard/training/new">Create Program</Link><Link className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-700" href="/dashboard/training/template">Download XLSX Template</Link></div> : null}
      </header>
      {params.error ? <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{errors[params.error] ?? "The training request failed."}{params.detail ? ` ${params.detail}` : ""}</p> : null}
      {params.message ? <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{messages[params.message] ?? "Training program updated."}</p> : null}
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-xl font-bold">{data.isAuthor ? "My Programs" : "Available programs"}</h2>
        {visiblePrograms.length === 0 ? <p className="mt-4 text-sm text-gray-600">{data.isAuthor ? "You have not created a training program yet. Choose an athlete&apos;s active race goal to start planning." : "No training program has been assigned to your active race goal yet."}</p> : <div className="mt-5 grid gap-4 sm:grid-cols-2">{visiblePrograms.map((program) => <Link className="rounded-lg border border-gray-200 p-4 hover:border-indigo-300" href={`/dashboard/training/${program.id}`} key={program.id}><div className="flex justify-between gap-3"><h3 className="font-bold">{program.name}</h3><span className={`text-xs font-bold ${program.status === "CANCELLED" ? "text-gray-700" : "text-indigo-700"}`}>{program.status === "CANCELLED" ? "Cancelled" : program.status === "ARCHIVED" ? "Archived" : program.status === "DRAFT" ? "Draft" : "Published"}</span></div><p className="mt-2 text-sm text-gray-600">{program.race_goal.athlete.full_name ?? "Athlete"} · {program.race_goal.race.name}</p><p className="mt-1 text-xs text-gray-500">{formatTrainingDate(program.start_date)} – {formatTrainingDate(program.end_date)}</p></Link>)}</div>}
      </section>
      {data.isAuthor ? <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Athletes with active race goals</h2><p className="mt-2 text-sm text-gray-600">Athletes without a published program are shown first.</p></div><Link className="text-sm font-semibold text-indigo-700 hover:text-indigo-500" href="/dashboard/race-goals">View race goals →</Link></div>{activeGoals.length === 0 ? <p className="mt-4 text-sm text-gray-600">No athletes have an active race goal yet.</p> : <div className="mt-5 grid gap-4 sm:grid-cols-2">{activeGoals.map((goal) => { const program = activeProgramByGoal.get(goal.id); return <div className="rounded-lg border border-gray-200 p-4" key={goal.id}><p className="font-bold">{goal.athlete.full_name ?? goal.athlete.email ?? "Athlete"}</p><p className="mt-1 text-sm text-gray-600">{goal.race.name}</p><p className="mt-1 text-xs text-gray-500">Race date: {formatTrainingDate(goal.race.event_date)}</p>{program ? <Link className="mt-4 inline-flex rounded-md border border-indigo-600 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50" href={`/dashboard/training/${program.id}`}>Evaluate Training Program</Link> : <Link className="mt-4 inline-flex rounded-md border border-indigo-600 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50" href={`/dashboard/training/new?raceGoalId=${goal.id}`}>Create training program</Link>}</div>; })}</div>}</section> : null}
      {data.isAuthor ? <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"><h2 className="text-xl font-bold">Import training plan</h2><p className="mt-2 text-sm text-gray-600">Upload your Excel plan, review the sessions, and confirm when everything looks right.</p><div className="mt-6"><TrainingImportForm raceGoals={data.raceGoals} /></div></section> : null}
    </div>
  );
}
