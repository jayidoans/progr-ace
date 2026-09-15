import { redirect } from "next/navigation";

import { ProgramForm } from "@/src/features/training/programs/components/program-forms";
import { getTrainingDashboardData } from "@/src/features/training/queries";

export default async function NewTrainingProgramPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [data, params] = await Promise.all([getTrainingDashboardData(), searchParams]);
  if (!data.isAuthor) redirect("/dashboard/training");
  return <div className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Manual authoring</p><h1 className="mt-2 text-3xl font-bold">Create training program</h1><p className="mt-3 text-gray-600">Programs start as drafts and stay linked to one athlete race goal.</p>{params.error ? <p className="mt-5 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">Check all program fields and date order.</p> : null}<ProgramForm raceGoals={data.raceGoals} /></div>;
}
