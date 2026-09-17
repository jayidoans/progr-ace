import type { ComplianceCounts } from "@/src/features/evaluation/analytics";
import { validationLabel } from "@/src/features/validation/format";

const visibleStates = [
  "VERIFIED",
  "PARTIAL",
  "NEEDS_REVIEW",
  "REJECTED",
  "MISSED",
  "UPCOMING",
] as const;

const tone: Record<(typeof visibleStates)[number], string> = {
  VERIFIED: "bg-emerald-50 text-emerald-700",
  PARTIAL: "bg-amber-50 text-amber-700",
  NEEDS_REVIEW: "bg-blue-50 text-blue-700",
  REJECTED: "bg-red-50 text-red-700",
  MISSED: "bg-gray-100 text-gray-700",
  UPCOMING: "bg-indigo-50 text-indigo-700",
};

export function StatusSummary({ counts }: { counts: ComplianceCounts }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {visibleStates.map((state) => (
        <div className={`rounded-lg px-3 py-3 ${tone[state]}`} key={state}>
          <dt className="text-[11px] font-bold uppercase tracking-wide">
            {validationLabel(state)}
          </dt>
          <dd className="mt-1 text-2xl font-bold">{counts[state]}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EvaluationStateBadge({ state }: { state: string }) {
  const classes =
    state === "VERIFIED"
      ? "bg-emerald-50 text-emerald-700"
      : state === "PARTIAL"
        ? "bg-amber-50 text-amber-700"
        : state === "REJECTED" || state === "MISSED"
          ? "bg-red-50 text-red-700"
          : state === "NEEDS_REVIEW"
            ? "bg-blue-50 text-blue-700"
            : "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}>
      {validationLabel(state)}
    </span>
  );
}
