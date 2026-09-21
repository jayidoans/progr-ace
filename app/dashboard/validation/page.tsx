import Link from "next/link";

import { formatTrainingDate } from "@/src/features/training/format";
import { validationLabel } from "@/src/features/validation/format";
import { getValidationReviewQueue } from "@/src/features/validation/queries";

export default async function ValidationQueuePage() {
  const reviews = await getValidationReviewQueue();
  const unresolved = reviews.filter(
    (review) => review.automatic_result === "NEEDS_REVIEW" && review.evaluation_source === "AUTOMATIC",
  );
  const resolved = reviews.filter(
    (review) => review.automatic_result !== "NEEDS_REVIEW" || review.evaluation_source === "COACH",
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Validation</p>
        <h1 className="mt-2 text-3xl font-bold">Coach review queue</h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          Review submitted training sessions that need your attention and revisit previously resolved results.
        </p>
      </header>

      <ReviewList empty="You're all caught up. There are no training sessions waiting for review." reviews={unresolved} title="Needs review" />
      <ReviewList empty="No resolved training sessions yet." reviews={resolved} title="Resolved sessions" />
    </div>
  );
}

function ReviewList({
  empty,
  reviews,
  title,
}: {
  empty: string;
  reviews: Awaited<ReturnType<typeof getValidationReviewQueue>>;
  title: string;
}) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-xl font-bold">{title}</h2>
      {reviews.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">{empty}</p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {reviews.map((review) => (
            <Link
              className="rounded-lg border border-gray-200 p-4 hover:border-indigo-300"
              href={`/dashboard/validation/${review.claim_id}`}
              key={review.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                    {review.claim.prescription.training_menu}
                  </p>
                  <h3 className="mt-1 font-bold">{review.claim.prescription.title}</h3>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                  {validationLabel(review.result)}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-600">
                {review.claim.athlete.full_name ?? review.claim.athlete.email ?? "Athlete"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {review.claim.prescription.training_week.program.name} · {formatTrainingDate(review.claim.prescription.scheduled_date)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
