import Link from "next/link";

import { ActivityEvidenceCard } from "@/src/features/claims/components/activity-evidence-card";
import { formatComponent, formatTrainingDate } from "@/src/features/training/format";
import { ReviewForm } from "@/src/features/validation/components/review-form";
import { ValidationSummary } from "@/src/features/validation/components/validation-summary";
import { getValidationReview } from "@/src/features/validation/queries";

const messages: Record<string, string> = {
  "review-saved": "Coach decision saved and is now visible to the athlete.",
};
const errors: Record<string, string> = {
  "invalid-review": "Choose a valid decision and provide a reason for Partial or Rejected.",
  "review-failed": "The review could not be saved. Check your authorization and the current validation state.",
};

export default async function ValidationReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ claimId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [{ claimId }, feedback] = await Promise.all([params, searchParams]);
  const review = await getValidationReview(claimId);
  const prescription = review.claim.prescription;

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header>
        <Link className="text-sm font-semibold text-indigo-700" href="/dashboard/validation">
          ← Review queue
        </Link>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-indigo-600">Coach review</p>
        <h1 className="mt-2 text-3xl font-bold">{prescription.title}</h1>
        <p className="mt-2 text-gray-600">
          {review.claim.athlete.full_name ?? review.claim.athlete.email ?? "Athlete"} · {prescription.training_week.program.name}
        </p>
      </header>

      {feedback.message ? (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
          {messages[feedback.message] ?? "Review updated."}
        </p>
      ) : null}
      {feedback.error ? (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {errors[feedback.error] ?? "The review request failed."}
        </p>
      ) : null}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="grid gap-4 sm:grid-cols-3">
          <div><p className="text-sm text-gray-500">Race goal</p><p className="font-semibold">{prescription.training_week.program.race_goal.race.name}</p></div>
          <div><p className="text-sm text-gray-500">Training week</p><p className="font-semibold">Week {prescription.training_week.week_number} · {prescription.training_week.phase}</p></div>
          <div><p className="text-sm text-gray-500">Scheduled date</p><p className="font-semibold">{formatTrainingDate(prescription.scheduled_date)}</p></div>
        </div>
        <div className="mt-5 border-t border-gray-100 pt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">{prescription.training_menu}</p>
          <div className="mt-2 space-y-1">
            {prescription.components.map((component) => (
              <p className="text-sm text-gray-700" key={component.id}>{formatComponent(component)}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-xl font-bold">Submitted evidence</h2>
        <div className="mt-5 space-y-3">
          {review.claim.evidence.map((evidence) => (
            <ActivityEvidenceCard activity={evidence.activity} key={evidence.id} showNote />
          ))}
        </div>
        <div className="mt-5 border-t border-gray-100 pt-5">
          <p className="text-sm font-bold">Claim note</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
            {review.claim.athlete_note ?? "No Claim Note."}
          </p>
        </div>
      </section>

      <ValidationSummary validation={review} />
      <ReviewForm claimId={review.claim_id} validation={review} />
    </div>
  );
}
