import assert from "node:assert/strict";
import test from "node:test";

import { getDashboardNavigationItems } from "./items";

test("base dashboard navigation remains available for every authenticated role", () => {
  const paths = getDashboardNavigationItems({ canReview: false, isAthlete: false }).map(
    (item) => item.href,
  );
  assert.deepEqual(paths, [
    "/dashboard",
    "/dashboard/race-goals",
    "/dashboard/training",
    "/dashboard/activities",
    "/dashboard/profile",
  ]);
});

test("athletes retain the Strava integration destination", () => {
  const paths = getDashboardNavigationItems({ canReview: false, isAthlete: true }).map(
    (item) => item.href,
  );
  assert.ok(paths.includes("/dashboard/integrations/strava"));
  assert.ok(!paths.includes("/dashboard/validation"));
});

test("coach and admin reviewers retain Validation without athlete-only Integrations", () => {
  const paths = getDashboardNavigationItems({ canReview: true, isAthlete: false }).map(
    (item) => item.href,
  );
  assert.ok(paths.includes("/dashboard/validation"));
  assert.ok(!paths.includes("/dashboard/integrations/strava"));
});
