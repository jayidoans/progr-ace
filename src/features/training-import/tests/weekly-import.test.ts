import assert from "node:assert/strict";
import test from "node:test";

import { selectWeeklyImport } from "@/src/features/training-import/weekly";
import type { NormalizedTrainingPlan, NormalizedWeek } from "@/src/features/training-import/types";

const week: NormalizedWeek = {
  weekNumber: 2,
  phase: "Build",
  startDate: "2026-09-28",
  endDate: "2026-10-04",
  prescriptions: [{
    session: "W2-EASY",
    scheduledDate: "2026-09-29",
    trainingMenu: "EASY",
    title: "Easy Run",
    description: null,
    components: [{
      sequenceOrder: 1,
      componentType: "EASY",
      targetDistanceM: 6000,
      targetDurationSec: null,
      repetitions: null,
      distancePerRepM: null,
      recoveryDurationSec: null,
      targetPaceMinSecPerKm: null,
      targetPaceMaxSecPerKm: null,
      instruction: "Comfortable effort",
    }],
  }],
};

function plan(weeks: NormalizedWeek[]): NormalizedTrainingPlan {
  return {
    templateVersion: 1,
    name: "Weekly import",
    description: null,
    startDate: weeks[0]?.startDate ?? "2026-09-28",
    endDate: weeks.at(-1)?.endDate ?? "2026-10-04",
    weeks,
  };
}

const target = { weekNumber: 2, startDate: "2026-09-28", endDate: "2026-10-04" };

test("weekly import accepts exactly the selected calendar week", () => {
  const result = selectWeeklyImport(plan([week]), target);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.week, week);
});

test("weekly import accepts a race-bounded partial week and normalizes its bounds", () => {
  const raceBoundedTarget = {
    weekNumber: 2,
    startDate: "2026-09-28",
    endDate: "2026-10-03",
  };
  const result = selectWeeklyImport(plan([week]), raceBoundedTarget);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.week.startDate, raceBoundedTarget.startDate);
    assert.equal(result.week.endDate, raceBoundedTarget.endDate);
  }
});

test("weekly import rejects sessions outside a race-bounded partial week", () => {
  const result = selectWeeklyImport(plan([{
    ...week,
    prescriptions: [{ ...week.prescriptions[0], scheduledDate: "2026-10-04" }],
  }]), {
    weekNumber: 2,
    startDate: "2026-09-28",
    endDate: "2026-10-03",
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /outside the selected week/i);
});

test("weekly import rejects multi-week workbooks", () => {
  const result = selectWeeklyImport(plan([week, { ...week, weekNumber: 3 }]), target);
  assert.deepEqual(result, {
    ok: false,
    message: "Weekly import requires a workbook containing exactly one week.",
  });
});

test("weekly import rejects a mismatched week identity or calendar range", () => {
  const result = selectWeeklyImport(plan([{ ...week, weekNumber: 8 }]), target);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /Week 2/);
});

test("weekly import rejects an empty weekly schedule", () => {
  const result = selectWeeklyImport(plan([{ ...week, prescriptions: [] }]), target);
  assert.deepEqual(result, {
    ok: false,
    message: "The workbook does not contain any training sessions for this week.",
  });
});
