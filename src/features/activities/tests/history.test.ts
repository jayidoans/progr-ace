import assert from "node:assert/strict";
import test from "node:test";

import {
  activityHistoryCutoff,
  filterActivityHistory,
  groupActivitiesByCalendarWeek,
  isInActivityHistoryWindow,
  resolveActivityWeekAnchor,
  revealNextActivityWeekIndex,
  revealPreviousActivityWeekIndex,
} from "../history";

type TestActivity = {
  claimUsage: { claimId: string } | null;
  id: string;
  source: "MANUAL" | "STRAVA";
  sport_type: string;
  started_at: string;
};

function activity(
  id: string,
  startedAt: string,
  options: Partial<Pick<TestActivity, "claimUsage" | "source" | "sport_type">> = {},
): TestActivity {
  return {
    claimUsage: null,
    id,
    source: "STRAVA",
    sport_type: "RUNNING",
    started_at: startedAt,
    ...options,
  };
}

test("uses calendar-month subtraction for the two-month history boundary", () => {
  const now = new Date("2026-09-22T10:15:30.000Z");
  assert.equal(activityHistoryCutoff(now), "2026-07-22T10:15:30.000Z");
  assert.equal(isInActivityHistoryWindow("2026-07-22T10:15:30.000Z", now), true);
  assert.equal(isInActivityHistoryWindow("2026-07-22T10:15:29.999Z", now), false);
});

test("groups every eligible Activity week without a 30-activity cap or empty weeks", () => {
  const activities = Array.from({ length: 31 }, (_, index) =>
    activity(`activity-${index}`, `2026-09-22T${String(index % 24).padStart(2, "0")}:00:00.000Z`),
  );
  const groups = groupActivitiesByCalendarWeek(activities);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].activities.length, 31);
  assert.equal(groups[0].startDate, "2026-09-21");
});

test("anchors to the Current Week when matching Activities exist", () => {
  const groups = groupActivitiesByCalendarWeek([
    activity("old", "2026-09-15T08:00:00.000Z"),
    activity("current", "2026-09-22T08:00:00.000Z"),
    activity("future", "2026-09-29T08:00:00.000Z"),
  ]);
  assert.deepEqual(resolveActivityWeekAnchor(groups, "2026-09-22"), {
    context: "CURRENT",
    currentWeek: { startDate: "2026-09-21", endDate: "2026-09-27" },
    index: 1,
  });
});

test("uses the nearest previous week, then the nearest later week, without adding empty groups", () => {
  const previousOnly = groupActivitiesByCalendarWeek([activity("old", "2026-09-15T08:00:00.000Z")]);
  assert.equal(resolveActivityWeekAnchor(previousOnly, "2026-09-22").context, "PREVIOUS");

  const laterOnly = groupActivitiesByCalendarWeek([activity("next", "2026-09-29T08:00:00.000Z")]);
  assert.equal(resolveActivityWeekAnchor(laterOnly, "2026-09-22").context, "NEXT");
});

test("claim and type filters use the actual Activity-to-Claim relationship and combine", () => {
  const activities = [
    activity("claimed-manual", "2026-09-15T08:00:00.000Z", { claimUsage: { claimId: "claim-1" }, source: "MANUAL", sport_type: "STRENGTH_TRAINING" }),
    activity("unclaimed-strava", "2026-09-22T08:00:00.000Z", { source: "STRAVA", sport_type: "RUNNING" }),
    activity("claimed-running", "2026-09-22T09:00:00.000Z", { claimUsage: { claimId: "claim-2" }, sport_type: "RUNNING" }),
  ];
  assert.deepEqual(filterActivityHistory(activities, "CLAIMED", "STRENGTH_TRAINING").map((item) => item.id), ["claimed-manual"]);
  assert.deepEqual(filterActivityHistory(activities, "NOT_CLAIMED", "RUNNING").map((item) => item.id), ["unclaimed-strava"]);
});

test("filters evaluate the full history before selecting the focused week", () => {
  const activities = [
    activity("current-claimed", "2026-09-22T08:00:00.000Z", { claimUsage: { claimId: "claim-1" } }),
    activity("previous-unclaimed", "2026-09-15T08:00:00.000Z"),
  ];
  const groups = groupActivitiesByCalendarWeek(filterActivityHistory(activities, "NOT_CLAIMED", "RUNNING"));
  assert.equal(groups.length, 1);
  assert.equal(resolveActivityWeekAnchor(groups, "2026-09-22").context, "PREVIOUS");
});

test("progressive reveal advances in two Activity-week groups and stops at boundaries", () => {
  assert.equal(revealPreviousActivityWeekIndex(6), 4);
  assert.equal(revealPreviousActivityWeekIndex(1), 0);
  assert.equal(revealNextActivityWeekIndex(3, 6), 5);
  assert.equal(revealNextActivityWeekIndex(5, 6), 5);
});
