import Link from "next/link";

import { TrainingImportForm } from "@/src/features/training-import/components";
import { formatTrainingDate } from "@/src/features/training/format";
import { getTrainingDashboardData } from "@/src/features/training/queries";

const errors: Record<string, string> = { "invalid-import": "Choose a program, race goal, and XLSX file.", "unsafe-workbook": "The workbook failed XLSX security validation.", "parse-failed": "The workbook contains import errors.", "preview-create-failed": "The import preview could not be saved.", "invalid-program": "The program could not be found." };

export default async function TrainingPage({ searchParams }: { searchParams: Promise<{ error?: string; detail?: string }> }) {
  const [data, params] = await Promise.all([getTrainingDashboardData(), searchParams]);
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Training</p><h1 className="mt-2 text-3xl font-bold">Training programs</h1><p className="mt-3 max-w-2xl text-gray-600">Create and manage structured training plans to guide athletes toward their race goals.</p></div>{data.isAuthor ? <div className="flex flex-wrap gap-3"><Link className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" href="/dashboard/training/new">Create Program</Link><Link className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-700" href="/dashboard/training/template">Download XLSX Template</Link></div> : null}</header>
      {params.error ? <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{errors[params.error] ?? "The training request failed."}{params.detail ? ` ${params.detail}` : ""}</p> : null}
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"><h2 className="text-xl font-bold">Available programs</h2>{data.programs.length === 0 ? <p className="mt-4 text-sm text-gray-600">No training programs are available.</p> : <div className="mt-5 grid gap-4 sm:grid-cols-2">{data.programs.map((program) => <Link className="rounded-lg border border-gray-200 p-4 hover:border-indigo-300" href={`/dashboard/training/${program.id}`} key={program.id}><div className="flex justify-between gap-3"><h3 className="font-bold">{program.name}</h3><span className="text-xs font-bold text-indigo-700">{program.status}</span></div><p className="mt-2 text-sm text-gray-600">{program.race_goal.athlete.full_name ?? "Athlete"} · {program.race_goal.race.name}</p><p className="mt-1 text-xs text-gray-500">{formatTrainingDate(program.start_date)} – {formatTrainingDate(program.end_date)}</p></Link>)}</div>}</section>
      {data.isAuthor ? <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"><h2 className="text-xl font-bold">Import training plan</h2><p className="mt-2 text-sm text-gray-600">Upload your Excel plan, review the sessions, and confirm when everything looks right.</p><div className="mt-6"><TrainingImportForm raceGoals={data.raceGoals} /></div></section> : null}
    </div>
  );
}
