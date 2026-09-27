import assert from "node:assert/strict";
import test from "node:test";

import { resolveTheme } from "./preferences";

test("theme preference defaults safely to light and recognizes dark", () => {
  assert.equal(resolveTheme(undefined), "light");
  assert.equal(resolveTheme("light"), "light");
  assert.equal(resolveTheme("dark"), "dark");
  assert.equal(resolveTheme("unexpected"), "light");
});
