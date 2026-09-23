import assert from "node:assert/strict";
import test from "node:test";

import { canOfferRaceGoalCompletion } from "./completion";

test("completion is unavailable before race day", () => {
  assert.equal(canOfferRaceGoalCompletion("ACTIVE", "2026-12-06", "2026-09-23"), false);
});

test("active goals can be completed on or after race day", () => {
  assert.equal(canOfferRaceGoalCompletion("ACTIVE", "2026-09-23", "2026-09-23"), true);
  assert.equal(canOfferRaceGoalCompletion("ACTIVE", "2026-09-22", "2026-09-23"), true);
});

test("terminal goals never expose completion again", () => {
  assert.equal(canOfferRaceGoalCompletion("COMPLETED", "2026-09-22", "2026-09-23"), false);
  assert.equal(canOfferRaceGoalCompletion("CANCELLED", "2026-09-22", "2026-09-23"), false);
});
