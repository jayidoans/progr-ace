import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { NotificationCenterList } from "./notification-center-list";
import type { NotificationItem } from "./presentation";

test("notification list has a natural empty state", () => {
  const html = renderToStaticMarkup(createElement(NotificationCenterList, {
    items: [], busy: false, onOpen: () => undefined,
  }));
  assert.match(html, /No notifications yet/);
});

test("recent list renders unread and read snapshots without interpreting HTML", () => {
  const items: NotificationItem[] = [
    { id: "a", title: "Training submitted", body: "<script>alert(1)</script>", target_path: "/dashboard/validation/a", read_at: null, created_at: "2026-10-07T00:00:00Z" },
    { id: "b", title: "Training reviewed", body: "Your session was reviewed.", target_path: null, read_at: "2026-10-07T01:00:00Z", created_at: "2026-10-07T00:00:00Z" },
  ];
  const html = renderToStaticMarkup(createElement(NotificationCenterList, {
    items, busy: false, onOpen: () => undefined,
  }));
  assert.match(html, /Training submitted/);
  assert.match(html, /Training reviewed/);
  assert.equal((html.match(/Unread/g) ?? []).length, 1);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
