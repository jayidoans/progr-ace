export type MetricCompleteness = "COMPLETE" | "PARTIAL" | "UNAVAILABLE";

/**
 * A numeric subtotal together with the coverage needed to interpret it.
 *
 * `value` is never used to stand in for missing data: null means no eligible
 * item supplied a measurable value. A zero remains a known, explicit value.
 */
export type MetricCoverage = {
  value: number | null;
  measuredItems: number;
  eligibleItems: number;
  completeness: MetricCompleteness;
};

export type TrainingInsightComponent = {
  target_distance_m: number | null;
  target_duration_sec: number | null;
  repetitions: number | null;
  distance_per_rep_m: number | null;
};

export type TrainingInsightActivity = {
  id: string;
  distance_m: number | null;
  duration_sec: number | null;
};

export type TrainingInsightOutcomeCounts = {
  UPCOMING: number;
  NOT_CLAIMED: number;
  DRAFT: number;
  SUBMITTED: number;
  VERIFIED: number;
  PARTIAL: number;
  NEEDS_REVIEW: number;
  REJECTED: number;
  MISSED: number;
};

export type TrainingInsightProgramReference = {
  id: string;
  name: string;
  status: string;
  athleteId: string;
  coachId: string;
};

export type TrainingInsightWeek = {
  id: string;
  weekNumber: number;
  phase: string | null;
  startDate: string;
  endDate: string;
  plannedDistance: MetricCoverage;
  actualDistance: MetricCoverage;
  outcomes: TrainingInsightOutcomeCounts;
  needsReviewCount: number;
  missedCount: number;
};

export type ProgramTrainingInsights = {
  program: TrainingInsightProgramReference;
  currentWeek: TrainingInsightWeek | null;
  fourWeekTrend: TrainingInsightWeek[];
  timezone: "UTC";
};

export type CoachTrainingInsightsSummary = {
  athlete: { id: string; name: string | null };
  program: TrainingInsightProgramReference;
  currentWeek: TrainingInsightWeek | null;
  trend: Array<Pick<TrainingInsightWeek, "startDate" | "endDate" | "plannedDistance" | "actualDistance">>;
};
