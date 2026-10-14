import assert from "node:assert/strict";
import test from "node:test";

import { applicationToday, demoFeatureAvailable, resolveDemoEnvironment } from "./policy";

test("normal deployments keep demo restrictions disabled", () => {
  const environment = resolveDemoEnvironment({});
  assert.equal(environment.enabled, false);
  assert.equal(environment.referenceDate, null);
  assert.equal(demoFeatureAvailable(environment, "registration"), true);
  assert.equal(demoFeatureAvailable(environment, "strava"), true);
});

test("demo deployments require a fixed reference date and restrict integration/account features", () => {
  const environment = resolveDemoEnvironment({
    PROGRACE_DEPLOYMENT_MODE: "demo",
    PROGRACE_DEMO_REFERENCE_DATE: "2027-01-08",
  });
  assert.equal(environment.enabled, true);
  assert.equal(environment.referenceDate, "2027-01-08");
  for (const feature of ["admin", "domain-mutations", "password-management", "push", "registration", "strava"] as const) {
    assert.equal(demoFeatureAvailable(environment, feature), false);
  }
});

test("demo deployment fails closed when the reference date is absent or invalid", () => {
  assert.throws(
    () => resolveDemoEnvironment({ PROGRACE_DEPLOYMENT_MODE: "demo" }),
    /valid PROGRACE_DEMO_REFERENCE_DATE/,
  );
  assert.throws(
    () => resolveDemoEnvironment({
      PROGRACE_DEPLOYMENT_MODE: "demo",
      PROGRACE_DEMO_REFERENCE_DATE: "2027-02-30",
    }),
    /valid PROGRACE_DEMO_REFERENCE_DATE/,
  );
});

test("demo time is fixed while normal deployments use the supplied current UTC date", () => {
  const now = new Date("2030-04-05T23:59:59.000Z");
  assert.equal(applicationToday(resolveDemoEnvironment({}), now), "2030-04-05");
  assert.equal(applicationToday(resolveDemoEnvironment({
    PROGRACE_DEPLOYMENT_MODE: "demo",
    PROGRACE_DEMO_REFERENCE_DATE: "2027-01-08",
  }), now), "2027-01-08");
});
