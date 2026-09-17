import assert from "node:assert/strict";
import test from "node:test";

import {
  activityListCutoff,
  activityListQueryLimit,
  nextActivityListLimit,
  paginateActivityList,
  parseActivityListLimit,
} from "../listing";

test("activity list limit is clamped to the supported 10, 20, and 30 batches", () => {
  assert.equal(parseActivityListLimit(undefined), 10);
  assert.equal(parseActivityListLimit("invalid"), 10);
  assert.equal(parseActivityListLimit("1"), 10);
  assert.equal(parseActivityListLimit("10"), 10);
  assert.equal(parseActivityListLimit("11"), 20);
  assert.equal(parseActivityListLimit("20"), 20);
  assert.equal(parseActivityListLimit("21"), 30);
  assert.equal(parseActivityListLimit("999"), 30);
  assert.equal(parseActivityListLimit(["20", "30"]), 20);
});

test("activity list cutoff is exactly 30 days before the supplied time", () => {
  assert.equal(
    activityListCutoff(new Date("2026-09-17T12:00:00.000Z")),
    "2026-08-18T12:00:00.000Z",
  );
});

test("queries use one look-ahead row without exceeding the 30 activity hard limit", () => {
  assert.equal(activityListQueryLimit(10), 11);
  assert.equal(activityListQueryLimit(20), 21);
  assert.equal(activityListQueryLimit(30), 30);
});

test("load-more progression stops after 30 activities", () => {
  assert.equal(nextActivityListLimit(10), 20);
  assert.equal(nextActivityListLimit(20), 30);
  assert.equal(nextActivityListLimit(30), null);
});

test("pagination keeps MANUAL and STRAVA evidence in the same bounded list", () => {
  const page = paginateActivityList(
    [
      { id: "newest", source: "STRAVA" },
      { id: "manual", source: "MANUAL" },
      ...Array.from({ length: 9 }, (_, index) => ({ id: `older-${index}`, source: "STRAVA" })),
    ],
    10,
  );

  assert.equal(page.records.length, 10);
  assert.equal(page.hasMore, true);
  assert.deepEqual(
    page.records.slice(0, 2).map((activity) => activity.source),
    ["STRAVA", "MANUAL"],
  );
});
