import assert from "node:assert/strict";
import test from "node:test";

import { targetDifferenceSec } from "@/src/features/race-results/domain";

test("target difference is derived only for a finished result with a target", () => {
  assert.equal(targetDifferenceSec({ status: "FINISHED", finishTimeSec: 13200 }, 13500), -300);
  assert.equal(targetDifferenceSec({ status: "FINISHED", finishTimeSec: 13500 }, 13500), 0);
  assert.equal(targetDifferenceSec({ status: "FINISHED", finishTimeSec: 13800 }, 13500), 300);
  assert.equal(targetDifferenceSec({ status: "DNF", finishTimeSec: null }, 13500), null);
  assert.equal(targetDifferenceSec({ status: "DNS", finishTimeSec: null }, 13500), null);
  assert.equal(targetDifferenceSec({ status: "FINISHED", finishTimeSec: 13200 }, null), null);
});
