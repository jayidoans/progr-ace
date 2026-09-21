import assert from "node:assert/strict";
import test from "node:test";

import { getDashboardNavigationGroups, getDashboardNavigationItems } from "./items";

test("athletes see the Training and Profile groups", () => {
  const groups = getDashboardNavigationGroups({ canReview: false, isAthlete: true });
  assert.deepEqual(groups.map((group) => group.label), ["Training", "Profile"]);
  assert.deepEqual(groups[0].items.map((item) => item.label), [
    "Race Goals",
    "Personal Training Schedule",
    "Activities",
  ]);
  assert.deepEqual(
    getDashboardNavigationItems({ canReview: false, isAthlete: true }).map((item) => item.href),
    [
      "/dashboard",
      "/dashboard/race-goals",
      "/dashboard/training",
      "/dashboard/activities",
      "/dashboard/profile",
      "/dashboard/integrations/strava",
    ],
  );
});

test("coach and admin reviewers see Coaching without athlete-only Strava", () => {
  const groups = getDashboardNavigationGroups({ canReview: true, isAthlete: false });
  assert.deepEqual(groups.map((group) => group.label), ["Training", "Coaching", "Profile"]);
  const paths = getDashboardNavigationItems({ canReview: true, isAthlete: false }).map(
    (item) => item.href,
  );
  assert.ok(paths.includes("/dashboard/validation"));
  assert.ok(paths.includes("/dashboard/training"));
  assert.ok(!paths.includes("/dashboard/integrations/strava"));
});
