import assert from "node:assert/strict";
import test from "node:test";

import { trainingDiagnosticRoute } from "./middleware";

test("only the intended Training routes are eligible for diagnostics", () => {
  assert.equal(trainingDiagnosticRoute("/dashboard/training"), "dashboard.training");
  assert.equal(
    trainingDiagnosticRoute("/dashboard/training/11111111-2222-4333-8444-555555555555"),
    "dashboard.training.program",
  );
  assert.equal(trainingDiagnosticRoute("/dashboard/training/new"), null);
  assert.equal(trainingDiagnosticRoute("/dashboard/training/template"), null);
  assert.equal(
    trainingDiagnosticRoute("/dashboard/training/11111111-2222-4333-8444-555555555555/progress"),
    null,
  );
  assert.equal(trainingDiagnosticRoute("/dashboard"), null);
});
