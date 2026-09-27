import {
  formatActivityDate,
  formatDistance,
  formatDuration,
  formatSportType,
} from "@/src/features/activities/format";
import { saveActivityComment, saveWeekReview } from "@/src/features/training-review/actions";
import { formatTrainingDate } from "@/src/features/training/format";
import type { TrainingScheduleWeek } from "@/src/features/training/queries";

type CoachCurrentWeekReviewProps = {
  programId: string;
  week: TrainingScheduleWeek;
};

export function CoachCurrentWeekReview({ programId, week }: CoachCurrentWeekReviewProps) {
  const claimedSessions = week.prescriptions.filter(
    (prescription) => prescription.claim?.status === "SUBMITTED" && prescription.claim.evidence.length > 0,
  );

  return (
    <section className="mt-6 border-t border-gray-200 pt-6" aria-labelledby={`week-review-${week.id}`}>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Coach review</p>
        <h3 className="mt-1 text-lg font-bold text-gray-950" id={`week-review-${week.id}`}>
          Current week feedback
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Open a claimed session to review its Activities, then record an overall weekly rating.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {claimedSessions.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-4 py-4 text-sm text-gray-600">
            No submitted Activity evidence is available for this week yet.
          </p>
        ) : claimedSessions.map((prescription) => (
          <details className="rounded-lg border border-gray-200 bg-gray-50" key={prescription.id}>
            <summary className="cursor-pointer list-none px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
              <span className="block text-xs font-bold uppercase tracking-wide text-indigo-700">
                {prescription.training_menu} · {formatTrainingDate(prescription.scheduled_date)}
              </span>
              <span className="mt-1 block font-bold text-gray-950">{prescription.title}</span>
              <span className="mt-1 block text-sm text-gray-600">
                {prescription.claim!.evidence.length} claimed {prescription.claim!.evidence.length === 1 ? "Activity" : "Activities"}
              </span>
            </summary>
            <div className="space-y-4 border-t border-gray-200 bg-white p-4">
              {prescription.claim!.evidence.map((evidence) => (
                <article className="rounded-lg border border-gray-200 p-4" key={evidence.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                        {formatSportType(evidence.activity.sport_type)}
                      </p>
                      <h4 className="mt-1 break-words font-bold text-gray-950">{evidence.activity.name}</h4>
                      <p className="mt-1 text-sm text-gray-500">{formatActivityDate(evidence.activity.started_at)}</p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                      {evidence.activity.source}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div><dt className="text-gray-500">Distance</dt><dd className="font-semibold">{formatDistance(evidence.activity.distance_m)}</dd></div>
                    <div><dt className="text-gray-500">Duration</dt><dd className="font-semibold">{formatDuration(evidence.activity.duration_sec)}</dd></div>
                    <div><dt className="text-gray-500">Average HR</dt><dd className="font-semibold">{evidence.activity.average_hr_bpm ? `${evidence.activity.average_hr_bpm} bpm` : "—"}</dd></div>
                    <div><dt className="text-gray-500">RPE</dt><dd className="font-semibold">{evidence.activity.rpe === null ? "—" : `${evidence.activity.rpe}/10`}</dd></div>
                  </dl>
                  {evidence.activity.notes ? (
                    <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      <span className="font-semibold">Athlete note:</span>{" "}
                      <span className="whitespace-pre-wrap">{evidence.activity.notes}</span>
                    </div>
                  ) : null}
                  <form action={saveActivityComment} className="mt-4 border-t border-gray-100 pt-4">
                    <input name="claimActivityId" type="hidden" value={evidence.id} />
                    <input name="programId" type="hidden" value={programId} />
                    <label className="text-sm font-semibold text-gray-800" htmlFor={`activity-comment-${evidence.id}`}>
                      Coach comment
                    </label>
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      defaultValue={evidence.comment?.coach_comment ?? ""}
                      id={`activity-comment-${evidence.id}`}
                      maxLength={4000}
                      name="coachComment"
                      placeholder="Add specific feedback for this Activity."
                      required
                    />
                    <button className="mt-3 min-h-11 rounded-md border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50" type="submit">
                      Save Activity Comment
                    </button>
                  </form>
                </article>
              ))}
            </div>
          </details>
        ))}
      </div>

      <form action={saveWeekReview} className="mt-6 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
        <input name="programId" type="hidden" value={programId} />
        <input name="trainingWeekId" type="hidden" value={week.id} />
        <div className="grid gap-4 md:grid-cols-[12rem_1fr]">
          <div>
            <label className="text-sm font-semibold text-gray-800" htmlFor={`week-rating-${week.id}`}>Fulfillment rating</label>
            <select
              className="mt-2 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
              defaultValue={week.review?.fulfillment_rating ?? ""}
              id={`week-rating-${week.id}`}
              name="fulfillmentRating"
              required
            >
              <option disabled value="">Select 0–10</option>
              {Array.from({ length: 11 }, (_, rating) => <option key={rating} value={rating}>{rating} / 10</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-800" htmlFor={`week-comment-${week.id}`}>Current week comment</label>
            <textarea
              className="mt-2 min-h-24 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              defaultValue={week.review?.coach_comment ?? ""}
              id={`week-comment-${week.id}`}
              maxLength={4000}
              name="coachComment"
              placeholder="Summarize this week's fulfillment and important context."
            />
          </div>
        </div>
        <button className="mt-4 min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700" type="submit">
          Save Week Review
        </button>
      </form>
    </section>
  );
}
