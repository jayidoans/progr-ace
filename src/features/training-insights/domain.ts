import {
  isExpectedPrescription,
  prescriptionComplianceState,
  type EvaluationPrescription,
} from "@/src/features/evaluation/analytics";

import type {
  MetricCoverage,
  TrainingInsightActivity,
  TrainingInsightComponent,
} from "./types";

export type { MetricCompleteness, MetricCoverage, TrainingInsightActivity, TrainingInsightComponent } from "./types";

function knownNonNegative(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Uses the existing component precedence: an explicit component distance wins
 * over repetitions × distance-per-repetition, so one component is never
 * counted twice.
 */
export function plannedDistanceForComponent(component: TrainingInsightComponent): number | null {
  if (knownNonNegative(component.target_distance_m)) return component.target_distance_m;
  if (knownNonNegative(component.repetitions) && knownNonNegative(component.distance_per_rep_m)) {
    return component.repetitions * component.distance_per_rep_m;
  }
  return null;
}

export function metricCoverage(values: Array<number | null | undefined>): MetricCoverage {
  const knownValues = values.filter(knownNonNegative);
  const eligibleItems = values.length;
  const measuredItems = knownValues.length;

  if (measuredItems === 0) {
    return {
      value: null,
      measuredItems,
      eligibleItems,
      completeness: "UNAVAILABLE",
    };
  }

  return {
    value: knownValues.reduce((total, value) => total + value, 0),
    measuredItems,
    eligibleItems,
    completeness: measuredItems === eligibleItems ? "COMPLETE" : "PARTIAL",
  };
}

export function mergeMetricCoverage(coverages: MetricCoverage[]): MetricCoverage {
  const eligibleItems = coverages.reduce((total, coverage) => total + coverage.eligibleItems, 0);
  const measuredItems = coverages.reduce((total, coverage) => total + coverage.measuredItems, 0);
  const values = coverages.flatMap((coverage) => coverage.value === null ? [] : [coverage.value]);

  if (measuredItems === 0) {
    return { value: null, measuredItems, eligibleItems, completeness: "UNAVAILABLE" };
  }

  return {
    value: values.reduce((total, value) => total + value, 0),
    measuredItems,
    eligibleItems,
    completeness: measuredItems === eligibleItems ? "COMPLETE" : "PARTIAL",
  };
}

export function plannedDistanceCoverage(components: TrainingInsightComponent[]): MetricCoverage {
  return metricCoverage(components.map(plannedDistanceForComponent));
}

export function plannedDurationCoverage(components: TrainingInsightComponent[]): MetricCoverage {
  return metricCoverage(components.map((component) => component.target_duration_sec));
}

export function deduplicateActivities<T extends TrainingInsightActivity>(activities: T[]): T[] {
  const unique = new Map<string, T>();
  activities.forEach((activity) => unique.set(activity.id, activity));
  return [...unique.values()];
}

export function actualDistanceCoverage(activities: TrainingInsightActivity[]): MetricCoverage {
  return metricCoverage(deduplicateActivities(activities).map((activity) => activity.distance_m));
}

export function actualDurationCoverage(activities: TrainingInsightActivity[]): MetricCoverage {
  return metricCoverage(deduplicateActivities(activities).map((activity) => activity.duration_sec));
}

/**
 * Keeps outcome ownership with M10. Insights may present this state, but never
 * create a new completion or adherence interpretation from it.
 */
export function trainingInsightComplianceState(
  prescription: EvaluationPrescription,
  today: string,
  claimStatus?: string | null,
  trackingStartDate?: string | null,
) {
  return prescriptionComplianceState(prescription, today, claimStatus, trackingStartDate);
}

/**
 * Keeps cancellation-boundary semantics aligned with M10 before callers
 * aggregate planned or actual metrics.
 */
export function isExpectedTrainingInsightPrescription(
  prescription: Pick<EvaluationPrescription, "scheduled_date">,
  cancelledAt?: string | null,
) {
  return isExpectedPrescription(prescription, cancelledAt);
}
