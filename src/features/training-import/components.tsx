import { confirmTrainingImport, uploadTrainingTemplate } from "@/src/features/training/actions";
import type { ProgramRaceGoal } from "@/src/features/training/queries";
import type { ImportIssue, NormalizedTrainingPlan } from "@/src/features/training-import/types";

const input = "mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-950";

export function TrainingImportForm({ raceGoals }: { raceGoals: ProgramRaceGoal[] }) {
  return (
    <form action={uploadTrainingTemplate} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-gray-800 sm:col-span-2">Athlete race goal<select className={input} name="raceGoalId" required><option value="">Select race goal</option>{raceGoals.map((goal) => <option key={goal.id} value={goal.id}>{goal.athlete.full_name ?? goal.athlete.email ?? "Athlete"} — {goal.race.name}</option>)}</select><span className="mt-1 block text-xs text-gray-500">The selected race day remains the program&apos;s final date.</span></label>
      <label className="text-sm font-medium text-gray-800">Program name<input className={input} maxLength={160} name="name" placeholder="e.g. Marathon Preparation" required /></label>
      <label className="text-sm font-medium text-gray-800">Description<input className={input} maxLength={2000} name="description" placeholder="Optional coaching context" /></label>
      <label className="text-sm font-medium text-gray-800 sm:col-span-2">ProgrACE Excel file<input accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className={input} name="template" required type="file" /><span className="mt-1 block text-xs text-gray-500">Use the ProgrACE template. Excel (.xlsx) files only, up to 1 MB; formulas and unsupported menus are rejected.</span></label>
      <button className="rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 sm:col-span-2" type="submit">Parse and preview</button>
    </form>
  );
}

export function ImportPreview({ previewId, plan, warnings, importedProgramId }: { previewId: string; plan: NormalizedTrainingPlan; warnings: ImportIssue[]; importedProgramId: string | null }) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <dl className="grid gap-4 sm:grid-cols-4"><div><dt className="text-xs font-bold uppercase text-gray-500">Program</dt><dd className="mt-1 font-semibold">{plan.name}</dd></div><div><dt className="text-xs font-bold uppercase text-gray-500">Weeks</dt><dd className="mt-1 font-semibold">{plan.weeks.length}</dd></div><div><dt className="text-xs font-bold uppercase text-gray-500">Sessions</dt><dd className="mt-1 font-semibold">{plan.weeks.reduce((sum, week) => sum + week.prescriptions.length, 0)}</dd></div><div><dt className="text-xs font-bold uppercase text-gray-500">Status after import</dt><dd className="mt-1 font-semibold">DRAFT</dd></div></dl>
      </section>
      {warnings.length > 0 ? <section className="rounded-xl bg-amber-50 p-5 text-sm text-amber-900"><h2 className="font-bold">Needs review</h2><ul className="mt-2 list-disc space-y-1 pl-5">{warnings.map((warning, index) => <li key={`${warning.row}-${index}`}>{warning.row ? `Row ${warning.row}: ` : ""}{warning.message}</li>)}</ul></section> : null}
      {plan.weeks.map((week) => <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200" key={week.weekNumber}><h2 className="font-bold">Week {week.weekNumber} — {week.phase}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">{Array.from({ length: 7 }, (_, dayIndex) => { const date = new Date(`${week.startDate}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + dayIndex); const iso = date.toISOString().slice(0, 10); const items = week.prescriptions.filter((item) => item.scheduledDate === iso); return <div className="min-h-28 rounded border border-gray-200 p-3" key={iso}><p className="text-xs font-bold text-gray-500">{["MON","TUE","WED","THU","FRI","SAT","SUN"][dayIndex]}</p>{items.length === 0 ? <p className="mt-3 text-sm text-gray-400">Rest day</p> : items.map((item) => <div className="mt-3" key={item.session}><p className="text-xs font-bold text-indigo-700">{item.trainingMenu}</p><p className="mt-1 text-sm font-semibold">{item.title}</p><p className="text-xs text-gray-500">{item.components.length} component{item.components.length === 1 ? "" : "s"}</p></div>)}</div>; })}</div></section>)}
      {importedProgramId ? <a className="inline-flex rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white" href={`/dashboard/training/${importedProgramId}`}>Open training program</a> : <form action={confirmTrainingImport}><input name="previewId" type="hidden" value={previewId} /><button className="rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500" type="submit">Add as draft program</button></form>}
    </div>
  );
}
