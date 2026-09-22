import assert from "node:assert/strict";
import { test } from "node:test";

import { runStravaDisconnectLifecycle } from "../disconnect-lifecycle";

test("disconnect revokes provider access before local deletion", async () => {
  const sequence: string[] = [];
  await runStravaDisconnectLifecycle({
    decryptRefreshToken: async () => { sequence.push("decrypt"); return "test-token"; },
    revokeProvider: async (token) => { assert.equal(token, "test-token"); sequence.push("revoke"); },
    removeLocalConnection: async () => { sequence.push("delete"); },
  });
  assert.deepEqual(sequence, ["decrypt", "revoke", "delete"]);
});

test("provider revoke failure retains local connection", async () => {
  let localDeleted = false;
  await assert.rejects(() => runStravaDisconnectLifecycle({
    decryptRefreshToken: async () => "test-token",
    revokeProvider: async () => { throw new Error("provider failed"); },
    removeLocalConnection: async () => { localDeleted = true; },
  }));
  assert.equal(localDeleted, false);
});
