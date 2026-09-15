import {
  distanceCompletion,
  formatValidationValue,
  validationLabel,
} from "@/src/features/validation/format";
import type { ValidationWithChecks } from "@/src/features/validation/types";

const resultStyles: Record<string, string> = {
  VERIFIED: "bg-emerald-50 text-emerald-700",
  PARTIAL: "bg-amber-50 text-amber-700",
  NEEDS_REVIEW: "bg-blue-50 text-blue-700",
  REJECTED: "bg-red-50 text-red-700",
  PASS: "bg-emerald-50 text-emerald-700",
  FAIL: "bg-red-50 text-red-700",
  NOT_EVALUABLE: "bg-blue-50 text-blue-700",
  INFO: "bg-gray-100 text-gray-700",
};

export function ValidationSummary({ validation }: { validation: ValidationWithChecks }) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Validation</p>
          <h2 className="mt-1 text-xl font-bold">Training compliance</h2>
          <p className="mt-2 text-sm text-gray-600">
            Evaluated from structured Prescription targets and immutable submitted evidence.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${resultStyles[validation.result]}`}>
          {validationLabel(validation.result)}
        </span>
      </div>

      <dl className="mt-5 grid gap-4 border-t border-gray-100 pt-5 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-gray-500">Current source</dt>
          <dd className="font-semibold">{validationLabel(validation.evaluation_source)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Automatic result</dt>
          <dd className="font-semibold">{validationLabel(validation.automatic_result)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Evaluated</dt>
          <dd className="font-semibold">
            {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(validation.evaluated_at),
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-5 space-y-3">
        {validation.checks.map((check) => {
          const completion = distanceCompletion(check);
          return (
            <article className="rounded-lg border border-gray-200 p-4" key={check.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">{validationLabel(check.check_type)}</h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    resultStyles[check.result] ?? resultStyles.INFO
                  }`}
                >
                  {validationLabel(check.result)}
                </span>
              </div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-500">Target</dt>
                  <dd className="font-semibold">
                    {formatValidationValue(check.target_value, check.target_text, check.unit)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Actual</dt>
                  <dd className="font-semibold">
                    {formatValidationValue(check.actual_value, check.actual_text, check.unit)}
                  </dd>
                </div>
              </dl>
              {completion !== null ? (
                <p className="mt-3 text-sm font-semibold text-gray-700">
                  Distance completion: {completion}%
                </p>
              ) : null}
              <p className="mt-2 text-sm text-gray-600">{check.message}</p>
            </article>
          );
        })}
      </div>

      {validation.evaluation_source === "COACH" ? (
        <div className="mt-5 rounded-lg bg-indigo-50 p-4">
          <p className="text-sm font-bold text-indigo-900">Coach review</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-indigo-800">
            {validation.reviewer_note ?? "Accepted by the Coach without an additional note."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
