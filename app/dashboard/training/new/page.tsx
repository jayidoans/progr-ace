import { redirect } from "next/navigation";

import { CopyProgramList, ProgramForm } from "@/src/features/training/programs/components/program-forms";
import { getCopyableTrainingPrograms, getTrainingDashboardData } from "@/src/features/training/queries";

export default async function NewTrainingProgramPage({ searchParams }: { searchParams: Promise<{ error?: string; raceGoalId?: string }> }) {
  const [data, copyablePrograms, params] = await Promise.all([getTrainingDashboardData(), getCopyableTrainingPrograms(), searchParams]);
  if (!data.isAuthor) redirect("/dashboard/training");
  return <div className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Training setup</p><h1 className="mt-2 text-3xl font-bold">Create training program</h1><p className="mt-3 text-gray-600">Build a structured plan around an athlete&apos;s race goal.</p>{params.error ? <p className="mt-5 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{params.error === "copy-different-race" ? "The source and destination must belong to the same race." : params.error === "copy-inactive-goal" ? "This race goal is no longer available for a new training program." : params.error === "copy-unauthorized" ? "That training program is not available." : params.error === "copy-failed" ? "Unable to copy the training program. Please try again." : "Check the program details and date order, then try again."}</p> : null}<ProgramForm raceGoals={data.raceGoals} selectedRaceGoalId={params.raceGoalId} /><CopyProgramList destinationGoals={data.raceGoals} programs={copyablePrograms} /></div>;
}
