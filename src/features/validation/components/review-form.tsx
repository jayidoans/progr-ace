import { reviewTrainingClaim } from "@/src/features/validation/actions";
import type { ValidationWithChecks } from "@/src/features/validation/types";

export function ReviewForm({
  claimId,
  validation,
}: {
  claimId: string;
  validation: ValidationWithChecks;
}) {
  if (validation.automatic_result !== "NEEDS_REVIEW") {
    return (
      <p className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">
        This claim was resolved automatically and does not require a Coach decision.
      </p>
    );
  }

  return (
    <form action={reviewTrainingClaim} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <input name="claimId" type="hidden" value={claimId} />
      <h2 className="text-xl font-bold">Coach decision</h2>
      <p className="mt-2 text-sm text-gray-600">
        Review the target, evidence, and automatic checks. Partial and Rejected decisions require a reason.
      </p>
      <label className="mt-5 block text-sm font-semibold text-gray-800">
        Reviewer note
        <textarea
          className="mt-2 min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 font-normal"
          defaultValue={validation.reviewer_note ?? ""}
          maxLength={4000}
          name="reviewerNote"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white" name="result" type="submit" value="VERIFIED">
          Verify
        </button>
        <button className="rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-white" name="result" type="submit" value="PARTIAL">
          Mark partial
        </button>
        <button className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white" name="result" type="submit" value="REJECTED">
          Reject
        </button>
      </div>
    </form>
  );
}
