import assert from "node:assert/strict";
import { test } from "node:test";

import { formatTrainingWeekRange } from "@/src/features/training/format";
import {
  resolveTrainingScheduleAnchor,
  revealNextWeekIndex,
  revealPreviousWeekIndex,
  visibleWeekIndexes,
} from "./training-schedule-utils";

const weeks = [
  { start_date: "2026-09-07", end_date: "2026-09-13" },
  { start_date: "2026-09-14", end_date: "2026-09-20" },
  { start_date: "2026-09-21", end_date: "2026-09-27" },
  { start_date: "2026-09-28", end_date: "2026-10-04" },
  { start_date: "2026-10-05", end_date: "2026-10-11" },
];

test("anchors the schedule to the program week containing the UTC calendar date", () => {
  assert.deepEqual(resolveTrainingScheduleAnchor(weeks, "2026-09-22"), { context: "CURRENT", index: 2 });
});

test("uses the first upcoming or final completed week outside program dates", () => {
  assert.deepEqual(resolveTrainingScheduleAnchor(weeks, "2026-09-01"), { context: "UPCOMING", index: 0 });
  assert.deepEqual(resolveTrainingScheduleAnchor(weeks, "2026-10-12"), { context: "COMPLETED", index: 4 });
});

test("reveals weeks in bounded chronological batches without crossing program boundaries", () => {
  assert.equal(revealPreviousWeekIndex(6), 4);
  assert.equal(revealPreviousWeekIndex(1), 0);
  assert.equal(revealPreviousWeekIndex(0), 0);
  assert.equal(revealNextWeekIndex(6, 10), 8);
  assert.equal(revealNextWeekIndex(8, 10), 9);
  assert.equal(revealNextWeekIndex(9, 10), 9);
  assert.deepEqual(visibleWeekIndexes(6, 6), [6]);
  assert.deepEqual(visibleWeekIndexes(4, 6), [4, 5, 6]);
  assert.deepEqual(visibleWeekIndexes(4, 8), [4, 5, 6, 7, 8]);
});

test("formats week ranges naturally within and across months and years", () => {
  assert.equal(formatTrainingWeekRange("2026-09-21", "2026-09-27"), "21–27 September 2026");
  assert.equal(formatTrainingWeekRange("2026-09-28", "2026-10-04"), "28 September–4 October 2026");
  assert.equal(formatTrainingWeekRange("2026-12-28", "2027-01-03"), "28 December 2026–3 January 2027");
});
