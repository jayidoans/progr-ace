import assert from "node:assert/strict";
import test from "node:test";

import {
  activityListCutoff,
} from "../listing";

test("activity list cutoff is exactly 30 days before the supplied time", () => {
  assert.equal(
    activityListCutoff(new Date("2026-09-17T12:00:00.000Z")),
    "2026-08-18T12:00:00.000Z",
  );
});
