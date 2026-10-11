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
