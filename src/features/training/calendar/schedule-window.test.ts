import assert from "node:assert/strict";
import { test } from "node:test";

import { selectTrainingScheduleWindow } from "./schedule-window";

test("loads only the selected calendar week and its next neighbour for a historical program", () => {
  const result = selectTrainingScheduleWindow(
    "2026-01-05",
    "2026-12-27",
    "2026-06-17",
    null,
    false,
  );

  assert.equal(result.anchorContext, "CURRENT");
  assert.equal(result.selected.start_date, "2026-06-15");
  assert.equal(result.next?.start_date, "2026-06-22");
  assert.equal(result.previous?.start_date, "2026-06-08");
  assert.equal(result.calendar.length, 51);
});

test("keeps an explicitly selected older week addressable after refresh", () => {
  const result = selectTrainingScheduleWindow(
    "2026-09-01",
    "2026-10-18",
    "2026-09-30",
    "2026-09-07",
    false,
  );

  assert.equal(result.selected.start_date, "2026-09-07");
  assert.equal(result.previous?.start_date, "2026-09-01");
  assert.equal(result.next?.start_date, "2026-09-14");
});

test("uses the adjacent week after planning when no explicit week is requested", () => {
  const result = selectTrainingScheduleWindow(
    "2026-09-21",
    "2026-10-18",
    "2026-09-22",
    null,
    true,
  );

  assert.equal(result.selected.start_date, "2026-09-28");
  assert.equal(result.anchorIndex, 0);
});

test("handles empty, single-week, and invalid requested-week boundaries safely", () => {
  const single = selectTrainingScheduleWindow(
    "2026-09-21",
    "2026-09-27",
    "2026-09-23",
    null,
    false,
  );
  assert.equal(single.selected.start_date, "2026-09-21");
  assert.equal(single.previous, null);
  assert.equal(single.next, null);

  const invalid = selectTrainingScheduleWindow(
    "2026-09-21",
    "2026-10-04",
    "2026-09-22",
    "2026-09-22",
    false,
  );
  assert.equal(invalid.selected.start_date, "2026-09-21");
});

test("preserves first and final partial calendar-week boundaries", () => {
  const first = selectTrainingScheduleWindow(
    "2026-09-09",
    "2026-10-02",
    "2026-09-01",
    null,
    false,
  );
  assert.equal(first.anchorContext, "UPCOMING");
  assert.equal(first.selected.start_date, "2026-09-09");
  assert.equal(first.selected.end_date, "2026-09-13");
  assert.equal(first.previous, null);

  const final = selectTrainingScheduleWindow(
    "2026-09-09",
    "2026-10-02",
    "2026-10-08",
    null,
    false,
  );
  assert.equal(final.anchorContext, "COMPLETED");
  assert.equal(final.selected.start_date, "2026-09-28");
  assert.equal(final.selected.end_date, "2026-10-02");
  assert.equal(final.next, null);
});
