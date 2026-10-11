import assert from "node:assert/strict";
import test from "node:test";

import { programReportFilename } from "./print-program-report-button";

test("report print title produces the documented browser PDF filename base", () => {
  assert.equal(
    programReportFilename("Marathon / Build", "Athlete: One", "2026-10-11"),
    "Marathon Build-Athlete One-2026-10-11",
  );
});
