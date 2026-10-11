import { notFound } from "next/navigation";

import { CoachProgramReportView } from "@/src/features/training-report/components/coach-program-report";
import { getCoachTrainingProgramReport } from "@/src/features/training-report/queries";

export default async function CoachTrainingProgramReportPage({
  params,
}: {
  params: Promise<{ athleteId: string; programId: string }>;
}) {
  const { athleteId, programId } = await params;
  const { report, raceResult } = await getCoachTrainingProgramReport(programId);
  if (report.context.athleteId !== athleteId) notFound();
  return <CoachProgramReportView report={report} raceResult={raceResult} />;
}
