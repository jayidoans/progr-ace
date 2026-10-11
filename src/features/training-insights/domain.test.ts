import assert from "node:assert/strict";
import test from "node:test";

import {
  actualDistanceCoverage,
  actualDurationCoverage,
  deduplicateActivities,
  isExpectedTrainingInsightPrescription,
  metricCoverage,
  plannedDistanceCoverage,
  plannedDistanceForComponent,
  plannedDurationCoverage,
  trainingInsightComplianceState,
} from "./domain";
import type { TrainingInsightActivity, TrainingInsightComponent } from "./types";

function component(overrides: Partial<TrainingInsightComponent> = {}): TrainingInsightComponent {
  return {
    target_distance_m: null,
    target_duration_sec: null,
    repetitions: null,
    distance_per_rep_m: null,
    ...overrides,
  };
}

function activity(id: string, overrides: Partial<TrainingInsightActivity> = {}): TrainingInsightActivity {
  return { id, distance_m: 5_000, duration_sec: 1_800, ...overrides };
}

function prescription(date: string, claimStatus: "DRAFT" | "SUBMITTED" | null = null) {
  return {
    id: "prescription-1",
    scheduled_date: date,
    title: "Easy Run",
    training_menu: "EASY",
    components: [{ id: "component-1", sequence_order: 1, target_distance_m: 5_000 }],
    claims: claimStatus ? [{
      id: "claim-1",
      status: claimStatus,
      submitted_at: claimStatus === "SUBMITTED" ? "2026-09-17T08:00:00Z" : null,
      validation: null,
      evidence: [],
    }] : [],
  };
}

test("planned distance covers direct, composite, and interval components", () => {
  assert.equal(plannedDistanceForComponent(component({ target_distance_m: 5_000 })), 5_000);
  assert.equal(plannedDistanceForComponent(component({ repetitions: 6, distance_per_rep_m: 800 })), 4_800);
  assert.deepEqual(
    plannedDistanceCoverage([
      component({ target_distance_m: 5_000 }),
      component({ repetitions: 4, distance_per_rep_m: 800 }),
    ]),
    { value: 8_200, measuredItems: 2, eligibleItems: 2, completeness: "COMPLETE" },
  );
});

test("direct distance takes precedence over repetition fields without double counting", () => {
  assert.equal(
    plannedDistanceForComponent(component({ target_distance_m: 1_000, repetitions: 4, distance_per_rep_m: 800 })),
    1_000,
  );
});

test("partial plans keep a measurable subtotal and duration remains explicit", () => {
  assert.deepEqual(
    plannedDistanceCoverage([
      component({ target_distance_m: 5_000 }),
      component({ target_duration_sec: 1_800 }),
      component(),
    ]),
    { value: 5_000, measuredItems: 1, eligibleItems: 3, completeness: "PARTIAL" },
  );
  assert.deepEqual(
    plannedDurationCoverage([
      component({ target_distance_m: 5_000 }),
      component({ target_duration_sec: 1_800 }),
    ]),
    { value: 1_800, measuredItems: 1, eligibleItems: 2, completeness: "PARTIAL" },
  );
  assert.deepEqual(plannedDistanceCoverage([component({ target_duration_sec: 1_800 })]), {
    value: null, measuredItems: 0, eligibleItems: 1, completeness: "UNAVAILABLE",
  });
});

test("unknown actual values remain unavailable while explicit zero remains known", () => {
  assert.deepEqual(actualDistanceCoverage([activity("unknown", { distance_m: null })]), {
    value: null, measuredItems: 0, eligibleItems: 1, completeness: "UNAVAILABLE",
  });
  assert.deepEqual(actualDistanceCoverage([activity("zero", { distance_m: 0 })]), {
    value: 0, measuredItems: 1, eligibleItems: 1, completeness: "COMPLETE",
  });
  assert.deepEqual(actualDurationCoverage([activity("known"), activity("unknown", { duration_sec: null })]), {
    value: 1_800, measuredItems: 1, eligibleItems: 2, completeness: "PARTIAL",
  });
});

test("activities are deduplicated by Activity identity before metrics are calculated", () => {
  const first = activity("same", { distance_m: 5_000 });
  const replacement = activity("same", { distance_m: 7_000 });
  assert.deepEqual(deduplicateActivities([first, replacement]).map((item) => item.distance_m), [7_000]);
  assert.deepEqual(actualDistanceCoverage([first, first, activity("other", { distance_m: 3_000 })]), {
    value: 8_000, measuredItems: 2, eligibleItems: 2, completeness: "COMPLETE",
  });
});

test("M10 tracking-start, cancellation, and submitted-claim semantics remain authoritative", () => {
  const historical = prescription("2026-09-16");
  assert.equal(trainingInsightComplianceState(historical, "2026-09-23", null, "2026-09-23"), "NOT_CLAIMED");
  assert.equal(trainingInsightComplianceState(prescription("2026-09-16", "DRAFT"), "2026-09-23"), "DRAFT");
  assert.equal(trainingInsightComplianceState(prescription("2026-09-16", "SUBMITTED"), "2026-09-23"), "SUBMITTED");
  assert.equal(isExpectedTrainingInsightPrescription(historical, "2026-09-17T08:00:00Z"), true);
  assert.equal(isExpectedTrainingInsightPrescription(prescription("2026-09-17"), "2026-09-17T08:00:00Z"), false);
});

test("an empty collection and unavailable submitted evidence never fabricate a zero", () => {
  assert.deepEqual(metricCoverage([]), {
    value: null, measuredItems: 0, eligibleItems: 0, completeness: "UNAVAILABLE",
  });
  assert.deepEqual(actualDistanceCoverage([]), {
    value: null, measuredItems: 0, eligibleItems: 0, completeness: "UNAVAILABLE",
  });
});
