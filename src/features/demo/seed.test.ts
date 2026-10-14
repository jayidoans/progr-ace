import assert from "node:assert/strict";
import test from "node:test";

import type { NormalizedTrainingPlan } from "@/src/features/training-import/types";

import {
  buildDemoSeedPlan,
  dayDifference,
  demoActualMetrics,
  demoEntityId,
  plannedDistanceM,
} from "./seed";

const source: NormalizedTrainingPlan = {
  templateVersion: 1,
  name: "Source",
  description: null,
  startDate: "2026-11-30",
  endDate: "2026-12-06",
  weeks: [{
    weekNumber: 1,
    phase: "Race Week",
    startDate: "2026-11-30",
    endDate: "2026-12-06",
    prescriptions: [
      {
        session: "W1-EASY",
        scheduledDate: "2026-12-01",
        trainingMenu: "EASY",
        title: "Easy Run",
        description: null,
        components: [{
          sequenceOrder: 1,
          componentType: "EASY",
          targetDistanceM: 5000,
          targetDurationSec: null,
          repetitions: null,
          distancePerRepM: null,
          recoveryDurationSec: null,
          targetPaceMinSecPerKm: null,
          targetPaceMaxSecPerKm: null,
          instruction: "Easy",
        }],
      },
      {
        session: "W1-RACE",
        scheduledDate: "2026-12-06",
        trainingMenu: "LONG",
        title: "Race Day",
        description: null,
        components: [{
          sequenceOrder: 1,
          componentType: "LONG",
          targetDistanceM: 42195,
          targetDurationSec: null,
          repetitions: null,
          distancePerRepM: null,
          recoveryDurationSec: null,
          targetPaceMinSecPerKm: null,
          targetPaceMaxSecPerKm: null,
          instruction: "Race",
        }],
      },
    ],
  }],
};

test("shifts the source plan to the requested race date without changing weekday structure", () => {
  const plan = buildDemoSeedPlan(source);
  assert.equal(dayDifference("2026-12-06", "2027-03-14"), 98);
  assert.equal(plan.shiftDays, 98);
  assert.equal(plan.startDate, "2027-03-08");
  assert.equal(plan.endDate, "2027-03-14");
  assert.equal(plan.weeks[0].prescriptions[1].scheduledDate, "2027-03-14");
});

test("keeps future sessions upcoming and assigns deterministic domain-compatible historical outcomes", () => {
  const historical = {
    ...source,
    startDate: "2026-09-21",
    endDate: "2026-09-27",
    weeks: [{
      ...source.weeks[0],
      startDate: "2026-09-21",
      endDate: "2026-09-27",
      prescriptions: Array.from({ length: 9 }, (_, index) => ({
        ...source.weeks[0].prescriptions[0],
        session: `S${index + 1}`,
        scheduledDate: `2026-09-${String(21 + Math.min(index, 6)).padStart(2, "0")}`,
      })),
    }],
  } satisfies NormalizedTrainingPlan;
  const plan = buildDemoSeedPlan(historical, { referenceDate: "2026-12-06", raceDate: "2026-12-06" });
  assert.deepEqual(
    plan.weeks[0].prescriptions.map((item) => item.outcome),
    ["VERIFIED", "PARTIAL", "OVER_TARGET", "MISSED", "VERIFIED", "VERIFIED", "PARTIAL", "OVER_TARGET", "MISSED"],
  );
});

test("uses direct component distance once and repetition distance only as a fallback", () => {
  const prescription = structuredClone(source.weeks[0].prescriptions[0]);
  prescription.components[0].repetitions = 8;
  prescription.components[0].distancePerRepM = 400;
  assert.equal(plannedDistanceM(prescription), 5000);
});

test("structured sessions remain needs-review unless a synthetic Coach decision is represented", () => {
  const structured = structuredClone(source);
  structured.endDate = "2026-12-06";
  structured.weeks[0].prescriptions = Array.from({ length: 4 }, (_, index) => ({
    ...structured.weeks[0].prescriptions[0],
    session: `INTERVAL-${index + 1}`,
    scheduledDate: `2026-12-0${index + 1}`,
    components: [{
      ...structured.weeks[0].prescriptions[0].components[0],
      componentType: "INTERVAL" as const,
      targetDistanceM: null,
      repetitions: 8,
      distancePerRepM: 400,
    }],
  }));
  structured.weeks[0].prescriptions.push(source.weeks[0].prescriptions[1]);
  const plan = buildDemoSeedPlan(structured, { referenceDate: "2027-03-14" });
  assert.deepEqual(
    plan.weeks[0].prescriptions.slice(0, 4).map((item) => item.outcome),
    ["NEEDS_REVIEW", "REJECTED", "VERIFIED", "NEEDS_REVIEW"],
  );
});

test("creates partial and over-target actuals without turning missing metrics into zero", () => {
  const base = {
    ...source.weeks[0].prescriptions[0],
    weekNumber: 1,
    phase: "Build",
  };
  assert.equal(demoActualMetrics({ ...base, outcome: "PARTIAL" }).distanceM, 3600);
  assert.equal(demoActualMetrics({ ...base, outcome: "OVER_TARGET" }).distanceM, 5900);
  const unavailable = structuredClone(base);
  unavailable.components[0].targetDistanceM = null;
  assert.equal(demoActualMetrics({ ...unavailable, outcome: "VERIFIED" }).distanceM, null);
});

test("stable demo identifiers are valid and distinct UUIDs", () => {
  assert.match(demoEntityId("program"), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9]{12}$/);
  assert.notEqual(demoEntityId("week", 1), demoEntityId("week", 2));
});
