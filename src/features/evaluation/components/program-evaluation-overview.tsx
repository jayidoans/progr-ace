import Link from "next/link";

import { formatDistance } from "@/src/features/activities/format";
import { StatusSummary } from "@/src/features/evaluation/components/status-summary";
import type { ProgramEvaluationOverview as ProgramEvaluationData } from "@/src/features/evaluation/queries";
import { formatTrainingDate } from "@/src/features/training/format";

export function ProgramEvaluationOverview({ evaluation }: { evaluation: ProgramEvaluationData }) {
  return (
    <section className="space-y-5 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Program evaluation</p>
        <h2 className="mt-1 text-xl font-bold text-gray-950">Session status overview</h2>
        <p className="mt-1 text-sm text-gray-600">Review training progress and completion for this program.</p>
      </div>
      <StatusSummary counts={evaluation.program.compliance} />
      <div className="grid gap-5 border-t border-gray-200 pt-5 lg:grid-cols-2">
        <div>
          <h3 className="font-bold text-gray-950">Needs review</h3>
          {evaluation.needsReview.length === 0 ? <p className="mt-2 text-sm text-gray-600">No training sessions need review.</p> : (
            <ul className="mt-3 space-y-2">
              {evaluation.needsReview.map((item) => (
                <li className="rounded-lg bg-gray-50 p-3" key={item.claimId}>
                  <p className="text-sm font-semibold text-gray-950">{item.prescriptionTitle}</p>
                  <p className="mt-1 text-xs text-gray-500">{formatTrainingDate(item.scheduledDate)} · {item.activityCount} evidence · {formatDistance(item.actualDistanceM)}</p>
                  <Link className="mt-2 inline-flex text-sm font-semibold text-indigo-700" href={`/dashboard/validation/${item.claimId}`}>Review →</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="font-bold text-gray-950">Missed sessions</h3>
          {evaluation.missed.length === 0 ? <p className="mt-2 text-sm text-gray-600">No missed training sessions.</p> : (
            <ul className="mt-3 space-y-2">
              {evaluation.missed.map((item) => (
                <li className="rounded-lg bg-gray-50 p-3" key={`${item.prescriptionTitle}-${item.scheduledDate}`}>
                  <p className="text-sm font-semibold text-gray-950">{item.prescriptionTitle}</p>
                  <p className="mt-1 text-xs text-gray-500">{formatTrainingDate(item.scheduledDate)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
