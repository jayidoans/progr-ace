import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("public demo entry contains no shared-account credential or identifier", () => {
  const entry = read("src/features/demo/demo-entry.tsx");
  assert.match(entry, /Explore as Athlete/);
  assert.match(entry, /Explore as Coach/);
  assert.doesNotMatch(entry, /PROGRACE_DEMO_.*(?:EMAIL|PASSWORD)/);
  assert.doesNotMatch(entry, /@example\.com|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}/i);
});

test("demo login uses server-only credentials and a fail-closed rate limiter", () => {
  const login = read("src/features/demo/login.ts");
  assert.match(login, /^"use server";/);
  assert.match(login, /PROGRACE_DEMO_\$\{prefix\}_EMAIL/);
  assert.match(login, /PROGRACE_DEMO_\$\{prefix\}_PASSWORD/);
  assert.match(login, /DEMO_LOGIN_RATE_LIMITER/);
  assert.match(login, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(login, /if \(!limiter\) throw/);
  assert.doesNotMatch(login, /console\.(?:info|log|error)/);
});

test("domain mutation action boundaries reject the demo before mutation work", () => {
  for (const path of [
    "src/features/activities/actions.ts",
    "src/features/claims/actions.ts",
    "src/features/notifications/actions.ts",
    "src/features/race-goals/actions.ts",
    "src/features/race-results/actions.ts",
    "src/features/training/actions.ts",
    "src/features/training-cancellation/actions.ts",
    "src/features/training-review/actions.ts",
    "src/features/validation/actions.ts",
  ]) {
    assert.match(read(path), /assertDemoFeatureAvailable\("domain-mutations"\)/, path);
  }
});

test("date-sensitive read models use the application reference clock", () => {
  for (const path of [
    "src/features/activities/queries.ts",
    "src/features/claims/queries.ts",
    "src/features/dashboard/queries.ts",
    "src/features/evaluation/queries.ts",
    "src/features/running-analytics/queries.ts",
    "src/features/training-insights/queries.ts",
    "src/features/training-report/queries.ts",
    "src/features/training/queries.ts",
  ]) {
    assert.match(read(path), /getApplicationToday/, path);
  }
});

test("demo Strava sync is visibly simulated and client-only", () => {
  const component = read("src/features/demo/demo-strava-sync-button.tsx");
  assert.match(component, /Sync from Strava \(Demo\)/);
  assert.match(component, /no external Strava request was made/);
  assert.match(component, /type=\"button\"/);
  assert.doesNotMatch(component, /fetch\(|form action=|syncStravaActivities/);
  assert.match(read("scripts/provision-demo.ts"), /demoActivitySource/);
  assert.match(read("scripts/provision-demo.ts"), /external_activity_id/);
});
