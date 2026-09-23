import assert from "node:assert/strict";
import test from "node:test";

import { formatDifferenceText, formatDurationInput, parseDurationInput, raceResultStatusLabel } from "@/src/features/race-results/presentation";

test("duration input parses and formats race durations", () => {
  assert.equal(parseDurationInput("03:51:27"), 13887);
  assert.equal(parseDurationInput("12:15:09"), 44109);
  assert.equal(parseDurationInput("00:00:00"), null);
  assert.equal(parseDurationInput("03:60:00"), null);
  assert.equal(parseDurationInput("3:5:27"), null);
  assert.equal(formatDurationInput(13987), "03:53:07");
});

test("result labels and target differences stay factual", () => {
  assert.equal(raceResultStatusLabel("FINISHED"), "Finished");
  assert.equal(raceResultStatusLabel("DNF"), "Did Not Finish");
  assert.equal(raceResultStatusLabel("DNS"), "Did Not Start");
  assert.equal(formatDifferenceText(-218), "3m 38s faster than target");
  assert.equal(formatDifferenceText(0), "Matched target");
  assert.equal(formatDifferenceText(387), "6m 27s slower than target");
  assert.equal(formatDifferenceText(null), "—");
});
