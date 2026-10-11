import { formatDistance } from "@/src/features/activities/format";

import type { MetricCoverage } from "./types";

export type PresentedMetricCoverage = {
  value: string;
  detail: "Complete data" | "Partial data" | "Data unavailable";
  isPartial: boolean;
};

/**
 * The canonical metrics only sum non-negative values. A partial numeric subtotal
 * is therefore a lower bound; unknown data is never displayed as zero.
 */
export function presentDistanceCoverage(metric: MetricCoverage): PresentedMetricCoverage {
  if (metric.value === null || metric.completeness === "UNAVAILABLE") {
    return { value: "—", detail: "Data unavailable", isPartial: false };
  }
  if (metric.completeness === "PARTIAL") {
    return { value: `≥ ${formatDistance(metric.value)}`, detail: "Partial data", isPartial: true };
  }
  return { value: formatDistance(metric.value), detail: "Complete data", isPartial: false };
}

export function canShowDistanceRatio(planned: MetricCoverage, actual: MetricCoverage) {
  return planned.completeness === "COMPLETE"
    && actual.completeness === "COMPLETE"
    && planned.value !== null
    && actual.value !== null
    && planned.value > 0;
}
