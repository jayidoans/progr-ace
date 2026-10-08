import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyPerformanceRequestKind,
  createPerformanceRequestContext,
  emitPerformanceDiagnostic,
  estimateSerializedPayloadBytes,
  getPerformanceDiagnosticSettings,
  measureAsync,
  measureSync,
  PERFORMANCE_CORRELATION_HEADER,
  PERFORMANCE_ROUTE_HEADER,
  readPerformanceRequestContext,
  type PerformanceDiagnostic,
  withPerformanceRequestContext,
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

test("request kind classification uses only protocol headers", () => {
  assert.equal(classifyPerformanceRequestKind(new Headers({ rsc: "1", accept: "text/html" })), "rsc");
  assert.equal(classifyPerformanceRequestKind(new Headers({ accept: "text/html,application/xhtml+xml" })), "document");
  assert.equal(classifyPerformanceRequestKind(new Headers({ accept: "application/json" })), "unknown");
});

test("request context accepts only an opaque correlation id and fixed route", () => {
  const correlationId = "11111111-2222-4333-8444-555555555555";
  const created = createPerformanceRequestContext(
    "dashboard.training",
    new Headers({ rsc: "1" }),
    () => correlationId,
  );
  assert.deepEqual(created, {
    correlationId,
    requestKind: "rsc",
    route: "dashboard.training",
  });

  const restored = readPerformanceRequestContext(new Headers({
    [PERFORMANCE_CORRELATION_HEADER]: correlationId,
    [PERFORMANCE_ROUTE_HEADER]: "dashboard.training",
    rsc: "1",
  }));
  assert.deepEqual(restored, created);
  assert.equal(readPerformanceRequestContext(new Headers({
    [PERFORMANCE_CORRELATION_HEADER]: "athlete@example.com",
    [PERFORMANCE_ROUTE_HEADER]: "dashboard.training",
  })), null);
  assert.equal(readPerformanceRequestContext(new Headers({
    [PERFORMANCE_CORRELATION_HEADER]: correlationId,
    [PERFORMANCE_ROUTE_HEADER]: "https://example.com",
  })), null);
});

test("correlated diagnostics retain only approved aggregate fields", () => {
  const correlationId = "11111111-2222-4333-8444-555555555555";
  const correlated = withPerformanceRequestContext(
    {
      route: "dashboard.training.program",
      workflow: "training.program.detail",
      operation: "program-load",
      counts: { programs: 1, weeks: 2 },
    },
    { correlationId, requestKind: "document", route: "dashboard.training.program" },
  );
  const output: string[] = [];
  const originalInfo = console.info;
  console.info = (message: string) => output.push(message);
  try {
    measureSync(correlated, () => "unchanged", { enabled: true, environment: "production" });
  } finally {
    console.info = originalInfo;
  }

  const parsed = JSON.parse(output[0]) as Record<string, unknown>;
  assert.equal(parsed.correlationId, correlationId);
  assert.equal(parsed.requestKind, "document");
  assert.equal(Object.hasOwn(parsed, "url"), false);
  assert.equal(Object.hasOwn(parsed, "headers"), false);
  assert.doesNotMatch(output[0], /athlete@example\.com|token|cookie|authorization|password/i);
});
