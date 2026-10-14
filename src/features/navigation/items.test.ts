import assert from "node:assert/strict";
import test from "node:test";

import { getDashboardNavigationGroups, getDashboardNavigationItems } from "./items";

test("athletes see the Training and Profile groups", () => {
  const groups = getDashboardNavigationGroups({ activeMode: "ATHLETE", roles: ["ATHLETE"] });
  assert.deepEqual(groups.map((group) => group.label), ["Training", "Profile"]);
  assert.deepEqual(groups[0].items.map((item) => item.label), [
    "Race Goals",
    "Personal Training Schedule",
    "Activities",
  ]);
  assert.deepEqual(
    getDashboardNavigationItems({ activeMode: "ATHLETE", roles: ["ATHLETE"] }).map((item) => item.href),
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

test("admin mode shows Manage Users", () => {
  const groups = getDashboardNavigationGroups({ activeMode: "ADMIN", roles: ["ADMIN"] });
  assert.ok(groups.some((group) => group.label === "Admin"));
  assert.ok(getDashboardNavigationItems({ activeMode: "ADMIN", roles: ["ADMIN"] }).some((item) => item.href === "/dashboard/admin/users"));
});

test("Admin navigation follows actual roles, never mode alone", () => {
  assert.ok(getDashboardNavigationGroups({ activeMode: "ATHLETE", roles: ["ATHLETE", "ADMIN"] }).some((group) => group.label === "Admin"));
  assert.ok(!getDashboardNavigationGroups({ activeMode: "ADMIN", roles: ["ATHLETE"] }).some((group) => group.label === "Admin"));
});

test("coach and admin reviewers see Coaching without athlete-only Strava", () => {
  const groups = getDashboardNavigationGroups({ activeMode: "COACH", roles: ["COACH"] });
  assert.deepEqual(groups.map((group) => group.label), ["Coaching", "Profile"]);
  const paths = getDashboardNavigationItems({ activeMode: "COACH", roles: ["COACH"] }).map(
    (item) => item.href,
  );
  assert.ok(paths.includes("/dashboard/validation"));
  assert.ok(paths.includes("/dashboard/coaching/athletes"));
  assert.ok(paths.includes("/dashboard/training"));
  assert.ok(!paths.includes("/dashboard/integrations/strava"));
});

test("demo navigation hides Admin and Strava management without changing role ownership", () => {
  const athletePaths = getDashboardNavigationItems({
    activeMode: "ATHLETE",
    demoMode: true,
    roles: ["ATHLETE", "ADMIN"],
  }).map((item) => item.href);
  assert.ok(!athletePaths.includes("/dashboard/integrations/strava"));
  assert.ok(!athletePaths.includes("/dashboard/admin/users"));
  assert.ok(athletePaths.includes("/dashboard/training"));
  assert.ok(athletePaths.includes("/dashboard/profile"));
});
