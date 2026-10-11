import assert from "node:assert/strict";
import test from "node:test";

import { canShowDistanceRatio, presentDistanceCoverage } from "./presentation";

test("coverage presentation distinguishes complete, partial, unavailable, and explicit zero", () => {
  assert.deepEqual(presentDistanceCoverage({ value: 5_000, measuredItems: 2, eligibleItems: 2, completeness: "COMPLETE" }), {
    value: "5 km", detail: "Complete data", isPartial: false,
  });
  assert.deepEqual(presentDistanceCoverage({ value: 2_000, measuredItems: 1, eligibleItems: 2, completeness: "PARTIAL" }), {
    value: "≥ 2 km", detail: "Partial data", isPartial: true,
  });
  assert.deepEqual(presentDistanceCoverage({ value: null, measuredItems: 0, eligibleItems: 2, completeness: "UNAVAILABLE" }), {
    value: "—", detail: "Data unavailable", isPartial: false,
  });
  assert.equal(presentDistanceCoverage({ value: 0, measuredItems: 1, eligibleItems: 1, completeness: "COMPLETE" }).value, "0 km");
});

test("distance ratios require two complete values and a positive planned distance", () => {
  const complete = { value: 5_000, measuredItems: 1, eligibleItems: 1, completeness: "COMPLETE" } as const;
  assert.equal(canShowDistanceRatio(complete, complete), true);
  assert.equal(canShowDistanceRatio({ ...complete, completeness: "PARTIAL" }, complete), false);
  assert.equal(canShowDistanceRatio({ ...complete, value: 0 }, complete), false);
});
