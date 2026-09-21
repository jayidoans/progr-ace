import { notFound } from "next/navigation";

import { ImportPreview } from "@/src/features/training-import/components";
import type { ImportIssue, NormalizedTrainingPlan } from "@/src/features/training-import/types";
import { getTrainingImportPreview } from "@/src/features/training/queries";

export default async function TrainingImportPreviewPage({ params, searchParams }: { params: Promise<{ previewId: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ previewId }, feedback] = await Promise.all([params, searchParams]);
  const preview = await getTrainingImportPreview(previewId);
  if (!preview) notFound();
  return <div className="space-y-7"><header><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Import preview</p><h1 className="mt-2 text-3xl font-bold">Review your training plan</h1><p className="mt-3 text-gray-600">Check the weeks and sessions below before adding the plan.</p></header>{feedback.error ? <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">The training plan could not be imported. Please review the file and try again.</p> : null}<ImportPreview importedProgramId={preview.imported_program_id} plan={preview.payload as unknown as NormalizedTrainingPlan} previewId={preview.id} warnings={preview.warnings as unknown as ImportIssue[]} /></div>;
}
