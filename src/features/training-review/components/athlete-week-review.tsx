import type { TrainingScheduleWeek } from "@/src/features/training/queries";

type AthleteWeekReviewProps = {
  review: NonNullable<TrainingScheduleWeek["review"]>;
  weekId: string;
};

export function AthleteWeekReview({ review, weekId }: AthleteWeekReviewProps) {
  return (
    <section className="mt-6 border-t border-gray-200 pt-6" aria-labelledby={`athlete-week-review-${weekId}`}>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Coach feedback</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-950" id={`athlete-week-review-${weekId}`}>
              Weekly training review
            </h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
              {review.coach_comment ?? "No written comment was added for this week."}
            </p>
          </div>
          <div className="shrink-0 rounded-lg bg-white px-4 py-3 text-center ring-1 ring-emerald-200">
            <p className="text-xs font-semibold text-gray-600">Fulfillment rating</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {review.fulfillment_rating}<span className="text-sm text-gray-500">/10</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
