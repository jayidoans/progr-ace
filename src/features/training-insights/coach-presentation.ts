import type { CoachTrainingInsightsSummary } from "./types";

export type CoachInsightsOverview = {
  programsShown: number;
  athletesRepresented: number;
  needsReview: number;
  missed: number;
  athletesRequiringFollowUp: number;
};

export function summarizeCoachTrainingInsights(
  summaries: CoachTrainingInsightsSummary[],
): CoachInsightsOverview {
  const athletes = new Set<string>();
  const requiringFollowUp = new Set<string>();
  let needsReview = 0;
  let missed = 0;

  summaries.forEach((summary) => {
    athletes.add(summary.athlete.id);
    const current = summary.currentWeek;
    const reviewCount = current?.needsReviewCount ?? 0;
    const missedCount = current?.missedCount ?? 0;
    needsReview += reviewCount;
    missed += missedCount;
    if (reviewCount + missedCount > 0) requiringFollowUp.add(summary.athlete.id);
  });

  return {
    programsShown: summaries.length,
    athletesRepresented: athletes.size,
    needsReview,
    missed,
    athletesRequiringFollowUp: requiringFollowUp.size,
  };
}
