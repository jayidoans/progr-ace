import Link from "next/link";
import { redirect } from "next/navigation";

import { ClaimBuilder } from "@/src/features/claims/components/claim-builder";
import { getClaimBuilder } from "@/src/features/claims/queries";

const errors: Record<string, string> = {
  "invalid-claim": "Select at least one valid activity and check the claim note.",
  "claim-create-failed":
    "The draft could not be created. The prescription or selected evidence may no longer be available.",
};

export default async function NewTrainingClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ prescriptionId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ prescriptionId }, feedback] = await Promise.all([params, searchParams]);
  const data = await getClaimBuilder(prescriptionId);
  if (data.existingClaimId) redirect(`/dashboard/claims/${data.existingClaimId}`);

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header>
        <Link
          className="text-sm font-semibold text-indigo-700"
          href={`/dashboard/training/${data.programId}`}
        >
          ← Training program
        </Link>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-indigo-600">
          Training claim
        </p>
        <h1 className="mt-2 text-3xl font-bold">Choose your evidence</h1>
        <p className="mt-3 text-gray-600">
          A claim records your assertion that selected activities relate to this prescription. It
          does not validate or evaluate the workout.
        </p>
      </header>

      {feedback.error ? (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {errors[feedback.error] ?? "The claim request failed."}
        </p>
      ) : null}

      <ClaimBuilder
        candidates={data.candidates}
        prescription={data.prescription}
        programId={data.programId}
      />
    </div>
  );
}
