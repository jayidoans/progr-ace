import assert from "node:assert/strict";
import { test } from "node:test";

import { createWeeklySessionSchema, startWeeklyPlanSchema } from "./schemas";

const baseSession = {
  programId: "11111111-1111-4111-8111-111111111111",
  weekId: "22222222-2222-4222-8222-222222222222",
  trainingMenu: "SPEED",
  scheduledDate: "2026-09-16",
  title: "Intervals",
  description: "Controlled repetitions",
};

function component(componentType: string, details: Record<string, unknown>) {
  return {
    componentType,
    targetDistanceM: null,
    targetDurationSec: null,
    repetitions: null,
    distancePerRepM: null,
    recoveryDurationSec: null,
    targetPaceMinSecPerKm: null,
    targetPaceMaxSecPerKm: null,
    instruction: null,
    ...details,
  };
}

test("weekly planner accepts ordered multi-component sessions", () => {
  const result = createWeeklySessionSchema.safeParse({
    ...baseSession,
    components: [
      component("EASY", { targetDistanceM: 2000 }),
      component("INTERVAL", { repetitions: 6, distancePerRepM: 400 }),
    ],
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.data.components.map((item) => item.componentType), ["EASY", "INTERVAL"]);
  }
});

test("weekly planner rejects sessions without workout details", () => {
  const result = createWeeklySessionSchema.safeParse({
    ...baseSession,
    components: [component("EASY", {})],
  });

  assert.equal(result.success, false);
});

test("weekly planner rejects unsupported menus and malformed dates", () => {
  assert.equal(createWeeklySessionSchema.safeParse({
    ...baseSession,
    trainingMenu: "REST",
    components: [component("EASY", { targetDistanceM: 5000 })],
  }).success, false);
  assert.equal(startWeeklyPlanSchema.safeParse({
    programId: baseSession.programId,
    weekDate: "16/09/2026",
  }).success, false);
});
