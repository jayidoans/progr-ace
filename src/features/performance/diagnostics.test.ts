import assert from "node:assert/strict";
import test from "node:test";

import {
  emitPerformanceDiagnostic,
  estimateSerializedPayloadBytes,
  getPerformanceDiagnosticSettings,
  measureAsync,
  measureSync,
  type PerformanceDiagnostic,
} from "./diagnostics";

test("performance diagnostics are disabled unless explicitly enabled", async () => {
  const settings = getPerformanceDiagnosticSettings({ NODE_ENV: "production" });
  assert.deepEqual(settings, { enabled: false, environment: "production" });

  let calls = 0;
  const value = await measureAsync(
    { route: "dashboard", workflow: "evaluation.dashboard", operation: "programs", queryCount: 1 },
    async () => {
      calls += 1;
      return "ok";
    },
    settings,
  );
  assert.equal(value, "ok");
  assert.equal(calls, 1);

  let inputFactoryCalls = 0;
  const transformed = measureSync(
    () => {
      inputFactoryCalls += 1;
      return { route: "dashboard", workflow: "evaluation.dashboard", operation: "expensive-counts" };
    },
    () => "unchanged",
    settings,
  );
  assert.equal(transformed, "unchanged");
  assert.equal(inputFactoryCalls, 0);
});

test("enabled diagnostics emit only safe aggregate fields", () => {
  const output: string[] = [];
  const diagnostic: PerformanceDiagnostic = {
    event: "prograce.performance",
    environment: "production",
    diagnosticsEnabled: true,
    route: "dashboard.training.program",
    workflow: "training.program.detail",
    operation: "claims",
    durationMs: 12,
    outcome: "ok",
    queryCount: 1,
    counts: { programs: 1, weeks: 4, prescriptions: 20, claims: 12 },
    serializedPayloadBytes: 456,
  };
  emitPerformanceDiagnostic(diagnostic, (message) => output.push(message));

  const parsed = JSON.parse(output[0]) as Record<string, unknown>;
  assert.deepEqual(Object.keys(parsed).sort(), [
    "counts",
    "diagnosticsEnabled",
    "durationMs",
    "environment",
    "event",
    "operation",
    "outcome",
    "queryCount",
    "route",
    "serializedPayloadBytes",
    "workflow",
  ]);
  assert.doesNotMatch(output[0], /token|cookie|authorization|email|name|notes|strava/i);
});

test("measurements report duration and do not change return values", () => {
  const settings = { enabled: true, environment: "non-production" as const };
  const originalInfo = console.info;
  const output: string[] = [];
  console.info = (message: string) => output.push(message);
  try {
    const value = measureSync(
      { route: "dashboard", workflow: "evaluation.dashboard", operation: "transform", counts: { programs: 2 } },
      () => ({ result: "unchanged" }),
      settings,
    );
    assert.deepEqual(value, { result: "unchanged" });
  } finally {
    console.info = originalInfo;
  }
  const metric = JSON.parse(output[0]) as PerformanceDiagnostic;
  assert.equal(metric.durationMs >= 0, true);
  assert.deepEqual(metric.counts, { programs: 2 });
});

test("serialized payload estimates contain only byte counts, not payload contents", () => {
  const payload = { privateTrainingNote: "do not emit", programs: [{ id: "not-logged" }] };
  const bytes = estimateSerializedPayloadBytes(payload);
  assert.equal(typeof bytes, "number");
  assert.ok((bytes ?? 0) > 0);
});
