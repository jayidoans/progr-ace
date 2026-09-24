import { notFound } from "next/navigation";

import { ProgramEvaluationOverview } from "@/src/features/evaluation/components/program-evaluation-overview";
import { getCoachProgramEvaluation } from "@/src/features/evaluation/queries";
import { TrainingSchedule } from "@/src/features/training/calendar/training-schedule";
import { formatTrainingDate } from "@/src/features/training/format";
import { ComponentForm, PrescriptionForm, PublishProgramForm, WeekForm } from "@/src/features/training/programs/components/program-forms";
import { getTrainingProgram } from "@/src/features/training/queries";

const messages: Record<string,string> = {
  "program-copied":"Training program copied. Review the draft before publishing.",
  "program-created":"Draft program created.",
  "week-created":"Training week added.",
  "prescription-created":"Prescription and first component added.",
  "component-created":"Workout component added.",
  "program-published":"Program published to the athlete.",
  "import-confirmed":"XLSX imported as a draft program.",
  "import-already-confirmed":"This workbook was already imported.",
  "week-planning-started":"This week is ready for planning.",
  "next-week-started":"The next week is ready for planning.",
  "program-extended-next-week":"The program now runs through Race Day, and the next week is ready for planning.",
  "session-created":"Training session added to the draft week.",
  "session-updated":"Training session updated.",
  "session-deleted":"Training session removed from the draft week.",
  "week-published":"Weekly training plan published to the Athlete.",
};

const errors: Record<string, string> = {
  "empty-week":"Add at least one training session before publishing this week.",
  "invalid-session":"Check the session and workout details, then try again.",
  "session-create-failed":"The training session could not be added.",
  "session-update-failed":"The training session could not be updated.",
  "session-delete-failed":"The training session could not be deleted.",
  "week-plan-failed":"Planning could not be started for this week.",
  "week-publish-failed":"This week could not be published.",
  "program-extension-failed":"The program could not be extended to Race Day.",
};

export default async function TrainingProgramPage({ params, searchParams }: { params: Promise<{ programId: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const [{ programId }, feedback] = await Promise.all([params, searchParams]);
  const [data, evaluation] = await Promise.all([
    getTrainingProgram(programId),
    getCoachProgramEvaluation(programId),
  ]);
  if (!data.program) notFound();
  const program = data.program;
  const canExtendToRaceDate = data.canPlan && program.end_date < program.race_goal.race.event_date && new Date(`${program.end_date}T00:00:00Z`).getUTCDay() === 0;
  const focusNextWeek = feedback.message === "next-week-started" || feedback.message === "program-extended-next-week";
  return <div className="space-y-8"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">{program.status}</p><h1 className="mt-2 text-3xl font-bold">{program.name}</h1><p className="mt-2 text-gray-600">{program.race_goal.athlete.full_name ?? "Athlete"} · {program.race_goal.race.name}</p><p className="mt-1 text-sm text-gray-500">{formatTrainingDate(program.start_date)} – {formatTrainingDate(program.end_date)}</p></div>{data.canEdit ? <PublishProgramForm programId={program.id} /> : null}</header>{feedback.message ? <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{messages[feedback.message] ?? "Training program updated."}</p> : null}{feedback.error ? <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{errors[feedback.error] ?? "The requested draft change failed. Check dates, ordering, and required values."}</p> : null}{evaluation ? <ProgramEvaluationOverview evaluation={evaluation} /> : null}{data.canPlan ? <div><h2 className="text-xl font-bold text-gray-950">Training Schedule</h2><p className="mt-1 text-sm text-gray-600">Plan your athlete&apos;s training schedule by importing a complete plan or adding training week by week.</p></div> : null}{data.scheduleWeeks.length === 0 ? <p className="rounded-xl bg-white p-6 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200">No training weeks fit within this program&apos;s date range.</p> : <TrainingSchedule activeMode={data.activeMode} canClaim={data.canClaim} canExtendToRaceDate={canExtendToRaceDate} canPlan={data.canPlan} focusNextWeek={focusNextWeek} programId={program.id} today={new Date().toISOString().slice(0, 10)} weeks={data.scheduleWeeks} />}{data.canEdit ? <section className="space-y-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200"><div><h2 className="text-xl font-bold">1. Add week</h2><p className="mt-1 text-sm text-gray-600">Weeks run Monday through Sunday; prescriptions may use any day.</p><div className="mt-4"><WeekForm programId={program.id} /></div></div><div className="border-t border-gray-200 pt-7"><h2 className="text-xl font-bold">2. Add prescription</h2><p className="mt-1 text-sm text-gray-600">Only planned sessions become rows. Leave rest days empty.</p><div className="mt-4"><PrescriptionForm program={program} /></div></div><div className="border-t border-gray-200 pt-7"><h2 className="text-xl font-bold">3. Add composite component</h2><p className="mt-1 text-sm text-gray-600">Add ordered detail such as warm-up, tempo, and cool-down.</p><div className="mt-4"><ComponentForm program={program} /></div></div></section> : null}</div>;
}
