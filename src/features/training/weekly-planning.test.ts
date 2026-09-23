import assert from "node:assert/strict";
import { test } from "node:test";

import { materializeProgramCalendar } from "./weekly-planning";

test("missing calendar weeks are UNPLANNED while stored lifecycle is preserved", () => {
  const weeks = materializeProgramCalendar("2026-09-07", "2026-09-27", [
    { id: "one", week_number: 1, phase: "Base", planning_status: "PUBLISHED", start_date: "2026-09-07", end_date: "2026-09-13", prescriptions: [{ id: "p1" }] },
    { id: "two", week_number: 2, phase: "Build", planning_status: "DRAFT", start_date: "2026-09-14", end_date: "2026-09-20", prescriptions: [{ id: "p2" }] },
  ]);
  assert.deepEqual(weeks.map((week) => week.planning_status), ["PUBLISHED", "DRAFT", "UNPLANNED"]);
  assert.deepEqual(weeks[2].prescriptions, []);
});

test("calendar materialization never exceeds the fixed program end date", () => {
  const weeks = materializeProgramCalendar("2026-11-30", "2026-12-06", []);
  assert.equal(weeks.length, 1);
  assert.equal(weeks[0].end_date, "2026-12-06");
  const partial = materializeProgramCalendar("2026-12-01", "2026-12-06", []);
  assert.equal(partial.length, 1);
  assert.equal(partial[0].start_date, "2026-12-01");
  assert.equal(partial[0].end_date, "2026-12-06");
});

test("partial boundary weeks preserve sequential numbering", () => {
  const weeks = materializeProgramCalendar("2026-09-09", "2026-09-22", []);

  assert.deepEqual(
    weeks.map((week) => [week.week_number, week.start_date, week.end_date]),
    [
      [1, "2026-09-09", "2026-09-13"],
      [2, "2026-09-14", "2026-09-20"],
      [3, "2026-09-21", "2026-09-22"],
    ],
  );
});
