import assert from "node:assert/strict";
import test from "node:test";

import { getHomepageActions } from "./presentation";

test("unauthenticated homepage actions use the existing login and registration routes", () => {
  const actions = getHomepageActions(false);
  assert.equal(actions.header.href, "/register");
  assert.equal(actions.primary.href, "/register");
  assert.equal(actions.secondary.href, "/login");
});

test("authenticated homepage actions return to existing application routes", () => {
  const actions = getHomepageActions(true);
  assert.equal(actions.header.href, "/dashboard");
  assert.equal(actions.primary.href, "/dashboard/training");
  assert.equal(actions.secondary.href, "/dashboard/activities");
});
