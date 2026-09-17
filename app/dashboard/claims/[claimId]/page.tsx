import Link from "next/link";

import {
  addClaimActivity,
  deleteClaimDraft,
  removeClaimActivity,
  updateClaimNote,
} from "@/src/features/claims/actions";
import { formatDistance, formatDuration } from "@/src/features/activities/format";
import { ActivityEvidenceCard } from "@/src/features/claims/components/activity-evidence-card";
import { SubmitClaimForm } from "@/src/features/claims/components/submit-claim-form";
import { getAvailableActivitiesForClaim, getClaim } from "@/src/features/claims/queries";
import { formatComponent, formatTrainingDate } from "@/src/features/training/format";
import { ValidationSummary } from "@/src/features/validation/components/validation-summary";

const messages: Record<string, string> = {
  "draft-created": "Draft saved. Review the evidence before submission.",
  "note-updated": "Claim note updated.",
  "evidence-added": "Activity evidence added.",
  "evidence-removed": "Activity evidence removed.",
  submitted: "Claim submitted. The claim and its evidence are now read-only.",
};

const errors: Record<string, string> = {
  "claim-update-failed": "The claim note could not be updated.",
  "evidence-add-failed": "The activity could not be added. It may already be used in another claim.",
  "evidence-already-used": "That activity is already evidence in another claim.",
  "evidence-remove-failed": "The activity could not be removed from this draft.",
  "claim-submit-failed": "The claim could not be submitted. Add valid evidence and try again.",
};

export default async function TrainingClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ claimId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [{ claimId }, feedback] = await Promise.all([params, searchParams]);
  const claim = await getClaim(claimId);
  const availableActivities = await getAvailableActivitiesForClaim(claim);
  const isDraft = claim.status === "DRAFT";
  const totalDistance = claim.evidence.reduce(
    (sum, item) => sum + (item.activity.distance_m ?? 0),
    0,
  );
  const totalDuration = claim.evidence.reduce(
    (sum, item) => sum + (item.activity.duration_sec ?? 0),
    0,
  );
  const programId = claim.prescription.training_week.program.id;

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header>
        <Link className="text-sm font-semibold text-indigo-700" href={`/dashboard/training/${programId}`}>
          ← Training program
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              Training claim
            </p>
            <h1 className="mt-2 text-3xl font-bold">Review claim</h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-bold ${
              isDraft ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {claim.status}
          </span>
        </div>
        {claim.submitted_at ? (
          <p className="mt-3 text-sm text-gray-600">
            Submitted {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(claim.submitted_at))}
          </p>
        ) : null}
      </header>

      {feedback.message ? (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
          {messages[feedback.message] ?? "Claim updated."}
        </p>
      ) : null}
      {feedback.error ? (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {errors[feedback.error] ?? "The claim request failed."}
        </p>
      ) : null}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
          {claim.prescription.training_menu}
        </p>
        <h2 className="mt-2 text-xl font-bold">{claim.prescription.title}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-gray-500">Training program</dt>
            <dd className="font-semibold">{claim.prescription.training_week.program.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Scheduled date</dt>
            <dd className="font-semibold">{formatTrainingDate(claim.prescription.scheduled_date)}</dd>
          </div>
        </dl>
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h3 className="text-sm font-bold text-gray-900">Prescription components / target</h3>
          <div className="mt-2 space-y-1">
            {claim.prescription.components.map((component) => (
              <p className="text-sm text-gray-700" key={component.id}>
                {formatComponent(component)}
              </p>
            ))}
          </div>
        </div>
      </section>

      {claim.validation ? <ValidationSummary validation={claim.validation} /> : null}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Selected evidence</h2>
            <p className="mt-1 text-sm text-gray-600">
              These totals describe the selection only; they are not a validation result.
            </p>
          </div>
          <dl className="flex gap-5 text-sm">
            <div>
              <dt className="text-gray-500">Distance</dt>
              <dd className="font-semibold">{formatDistance(totalDistance || null)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Duration</dt>
              <dd className="font-semibold">{formatDuration(totalDuration || null)}</dd>
            </div>
          </dl>
        </div>
        {claim.evidence.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
            No evidence selected. At least one activity is required before submission.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {claim.evidence.map((item) => (
              <div key={item.id}>
                <ActivityEvidenceCard activity={item.activity} showNote />
                {isDraft ? (
                  <form action={removeClaimActivity} className="mt-2 text-right">
                    <input name="claimId" type="hidden" value={claim.id} />
                    <input name="activityId" type="hidden" value={item.activity_id} />
                    <button className="text-sm font-semibold text-red-700" type="submit">
                      Remove evidence
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {isDraft && availableActivities.length > 0 ? (
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-xl font-bold">Add evidence</h2>
          <p className="mt-2 text-sm text-gray-600">
            Available activities are ordered by proximity to the scheduled date.
          </p>
          <div className="mt-5 space-y-3">
            {availableActivities.map((activity) => (
              <div key={activity.id}>
                <ActivityEvidenceCard
                  activity={activity}
                  proximityLabel={activity.proximityLabel}
                />
                <form action={addClaimActivity} className="mt-2 text-right">
                  <input name="claimId" type="hidden" value={claim.id} />
                  <input name="activityId" type="hidden" value={activity.id} />
                  <button className="text-sm font-semibold text-indigo-700" type="submit">
                    Add to claim
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-xl font-bold">Claim note</h2>
        {isDraft ? (
          <form action={updateClaimNote} className="mt-4">
            <input name="claimId" type="hidden" value={claim.id} />
            <textarea
              className="min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              defaultValue={claim.athlete_note ?? ""}
              maxLength={4000}
              name="athleteNote"
            />
            <button
              className="mt-3 rounded-md border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-700"
              type="submit"
            >
              Save note
            </button>
          </form>
        ) : (
          <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
            {claim.athlete_note ?? "No claim note."}
          </p>
        )}
      </section>

      {isDraft ? (
        <section className="space-y-4 border-t border-gray-200 pt-6">
          <SubmitClaimForm claimId={claim.id} />
          <form action={deleteClaimDraft}>
            <input name="claimId" type="hidden" value={claim.id} />
            <button className="text-sm font-semibold text-red-700" type="submit">
              Delete draft
            </button>
          </form>
        </section>
      ) : (
        <p className="rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">
          This submitted Claim and its Activity Evidence are read-only.
        </p>
      )}
    </div>
  );
}
