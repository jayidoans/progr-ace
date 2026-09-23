import Link from "next/link";

import { RunningProgressView } from "@/src/features/running-analytics/components/running-progress-view";
import { getProgramRunningAnalytics } from "@/src/features/running-analytics/queries";

export default async function TrainingProgressPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  const data = await getProgramRunningAnalytics(programId);
  return <div className="space-y-5"><Link className="text-sm font-semibold text-indigo-700" href={`/dashboard/training/${programId}`}>← Training Program</Link><RunningProgressView data={data} /></div>;
}
