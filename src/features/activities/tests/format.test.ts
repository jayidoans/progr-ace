import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  derivePaceSecPerKm,
  formatDuration,
  formatPace,
  kilometersToMeters,
  localDateTimeToIso,
  parseDuration,
} from "../format";

describe("activity canonical units", () => {
  it("converts kilometers to integer meters", () => {
    assert.equal(kilometersToMeters("5"), 5000);
    assert.equal(kilometersToMeters("7.39"), 7390);
    assert.equal(kilometersToMeters("42.195"), 42195);
  });

  it("parses and formats clock durations", () => {
    assert.equal(parseDuration("56:42"), 3402);
    assert.equal(parseDuration("1:02:03"), 3723);
    assert.equal(formatDuration(3402), "56:42");
    assert.equal(formatDuration(3723), "1:02:03");
  });

  it("derives running pace from canonical distance and duration", () => {
    assert.equal(derivePaceSecPerKm(7390, 3402), 460);
    assert.equal(formatPace(7390, 3402), "7:40/km");
  });

  it("does not produce pace without positive canonical inputs", () => {
    assert.equal(derivePaceSecPerKm(null, 3402), null);
    assert.equal(derivePaceSecPerKm(0, 3402), null);
    assert.equal(derivePaceSecPerKm(7390, null), null);
    assert.equal(formatPace(0, 3402), "—");
  });

  it("normalizes a browser-local timestamp with its selected-date offset", () => {
    assert.equal(localDateTimeToIso("2026-09-15T06:30", -420), "2026-09-14T23:30:00.000Z");
    assert.equal(localDateTimeToIso("2026-02-30T06:30", -420), null);
  });
});
