import assert from "node:assert/strict";
import test from "node:test";

import { deriveComplianceState, utcDateString } from "@/src/features/validation/engine/compliance";

test("derived compliance distinguishes past, present, and future prescriptions", () => {
  const today = "2026-09-15";
  assert.equal(deriveComplianceState("2026-09-14", null, today), "MISSED");
  assert.equal(deriveComplianceState("2026-09-15", null, today), "NOT_CLAIMED");
  assert.equal(deriveComplianceState("2026-09-16", null, today), "UPCOMING");
});

test("claim lifecycle takes precedence over the scheduled date", () => {
  assert.equal(
    deriveComplianceState("2020-01-01", { status: "DRAFT", validation: null }, "2026-09-15"),
    "DRAFT",
  );
  assert.equal(
    deriveComplianceState("2030-01-01", { status: "SUBMITTED", validation: null }, "2026-09-15"),
    "SUBMITTED",
  );
});

test("validation result takes precedence for a submitted claim", () => {
  for (const result of ["VERIFIED", "PARTIAL", "NEEDS_REVIEW", "REJECTED"] as const) {
    assert.equal(
      deriveComplianceState(
        "2030-01-01",
        { status: "SUBMITTED", validation: { result } },
        "2026-09-15",
      ),
      result,
    );
  }
});

test("UTC date conversion follows the project's date-only convention", () => {
  assert.equal(utcDateString(new Date("2026-09-15T23:59:59Z")), "2026-09-15");
});
