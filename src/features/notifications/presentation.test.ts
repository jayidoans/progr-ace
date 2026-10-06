import assert from "node:assert/strict";
import test from "node:test";

import {
  formatUnreadBadge,
  safeNotificationTarget,
  RECENT_NOTIFICATION_LIMIT,
} from "./presentation";

test("notification badge is bounded and empty when nothing is unread", () => {
  assert.equal(formatUnreadBadge(0), null);
  assert.equal(formatUnreadBadge(1), "1");
  assert.equal(formatUnreadBadge(9), "9");
  assert.equal(formatUnreadBadge(10), "9+");
  assert.equal(RECENT_NOTIFICATION_LIMIT, 10);
});

test("notification navigation accepts only internal dashboard paths", () => {
  assert.equal(safeNotificationTarget("/dashboard/validation/abc-123"), "/dashboard/validation/abc-123");
  assert.equal(safeNotificationTarget("/dashboard/training/123"), "/dashboard/training/123");
  for (const target of [null, "https://example.com", "//example.com", "/login", "/dashboard/../login", "/dashboard?next=https://example.com", "/dashboard/%2F%2Fevil.com"]) {
    assert.equal(safeNotificationTarget(target), null);
  }
});
