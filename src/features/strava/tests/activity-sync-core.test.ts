import assert from "node:assert/strict";
import { test } from "node:test";

import { fetchAllStravaActivities, StravaActivityPageLimitError } from "../activity-sync-core";
import type { StravaSummaryActivity } from "../activity-sync";

function activities(count: number): StravaSummaryActivity[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: "Run",
    sport_type: "Run",
    start_date: "2026-09-17T00:00:00Z",
    moving_time: 1,
  }));
}

test("pagination stops after a short page", async () => {
  const pages: number[] = [];
  const result = await fetchAllStravaActivities({
    after: 1,
    perPage: 2,
    maxPages: 4,
    fetchPage: async (page) => {
      pages.push(page);
      return page === 1 ? activities(2) : activities(1);
    },
  });
  assert.equal(result.length, 3);
  assert.deepEqual(pages, [1, 2]);
});

test("a full final safety page fails rather than reporting partial success", async () => {
  await assert.rejects(
    () => fetchAllStravaActivities({
      after: 1,
      perPage: 2,
      maxPages: 2,
      fetchPage: async () => activities(2),
    }),
    (error: unknown) => error instanceof StravaActivityPageLimitError,
  );
});
