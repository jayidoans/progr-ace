import { notFound } from "next/navigation";

import { ProgramEvaluationOverview } from "@/src/features/evaluation/components/program-evaluation-overview";
import { getCoachProgramEvaluation } from "@/src/features/evaluation/queries";
import { WeeklyTrainingCalendar } from "@/src/features/training/calendar/weekly-training-calendar";
import { formatTrainingDate } from "@/src/features/training/format";
import { ComponentForm, PrescriptionForm, PublishProgramForm, WeekForm } from "@/src/features/training/programs/components/program-forms";
import { getTrainingProgram } from "@/src/features/training/queries";

const messages: Record<string,string> = { "program-created":"Draft program created.", "week-created":"Training week added.", "prescription-created":"Prescription and first component added.", "component-created":"Workout component added.", "program-published":"Program published to the athlete.", "import-confirmed":"XLSX imported as a draft program.", "import-already-confirmed":"This workbook was already imported." };

export default async function TrainingProgramPage({ params, searchParams }: { params: Promise<{ programId: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const [{ programId }, feedback] = await Promise.all([params, searchParams]);
  const [data, evaluation] = await Promise.all([
    getTrainingProgram(programId),
    getCoachProgramEvaluation(programId),
  ]);
  if (!data.program) notFound();
  const program = data.program;
  return <div className="space-y-8"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">{program.status}</p><h1 className="mt-2 text-3xl font-bold">{program.name}</h1><p className="mt-2 text-gray-600">{program.race_goal.athlete.full_name ?? "Athlete"} · {program.race_goal.race.name}</p><p className="mt-1 text-sm text-gray-500">{formatTrainingDate(program.start_date)} – {formatTrainingDate(program.end_date)}</p></div>{data.canEdit ? <PublishProgramForm programId={program.id} /> : null}</header>{feedback.message ? <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{messages[feedback.message] ?? "Training program updated."}</p> : null}{feedback.error ? <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">The requested draft change failed. Check dates, ordering, and required values.</p> : null}{evaluation ? <ProgramEvaluationOverview evaluation={evaluation} /> : null}{program.weeks.length === 0 ? <p className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200">No weeks yet.</p> : program.weeks.map((week) => <WeeklyTrainingCalendar canClaim={data.canClaim} key={week.id} week={week} />)}{data.canEdit ? <section className="space-y-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"><div><h2 className="text-xl font-bold">1. Add week</h2><p className="mt-1 text-sm text-gray-600">Weeks run Monday through Sunday; prescriptions may use any day.</p><div className="mt-4"><WeekForm programId={program.id} /></div></div><div className="border-t border-gray-200 pt-7"><h2 className="text-xl font-bold">2. Add prescription</h2><p className="mt-1 text-sm text-gray-600">Only planned sessions become rows. Leave rest days empty.</p><div className="mt-4"><PrescriptionForm program={program} /></div></div><div className="border-t border-gray-200 pt-7"><h2 className="text-xl font-bold">3. Add composite component</h2><p className="mt-1 text-sm text-gray-600">Add ordered detail such as warm-up, tempo, and cool-down.</p><div className="mt-4"><ComponentForm program={program} /></div></div></section> : null}</div>;
}
