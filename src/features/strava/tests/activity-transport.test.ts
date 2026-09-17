import assert from "node:assert/strict";
import { test } from "node:test";

import {
  fetchStravaActivitiesPage,
  StravaActivityTransportError,
} from "../activity-transport";

const activity = {
  id: 1,
  name: "Run",
  sport_type: "Run",
  start_date: "2026-09-17T00:00:00Z",
  distance: 5000,
  moving_time: 1800,
  total_elevation_gain: 0,
};

test("activity transport uses bounded query parameters without putting the token in the URL", async () => {
  let requestedUrl = "";
  let authorization = "";
  const result = await fetchStravaActivitiesPage(
    { accessToken: "server-token", after: 123, page: 2, perPage: 100 },
    async (input, init) => {
      requestedUrl = String(input);
      authorization = new Headers(init?.headers).get("Authorization") ?? "";
      return new Response(JSON.stringify([activity]), { status: 200 });
    },
  );
  assert.equal(result.length, 1);
  assert.match(requestedUrl, /after=123/);
  assert.match(requestedUrl, /page=2/);
  assert.match(requestedUrl, /per_page=100/);
  assert.equal(requestedUrl.includes("server-token"), false);
  assert.equal(authorization, "Bearer server-token");
});

test("401, 403, and 429 produce safe typed errors", async () => {
  for (const status of [401, 403, 429]) {
    await assert.rejects(
      () => fetchStravaActivitiesPage(
        { accessToken: "secret", after: 1, page: 1, perPage: 100 },
        async () => new Response(JSON.stringify({ provider: "detail" }), { status }),
      ),
      (error: unknown) =>
        error instanceof StravaActivityTransportError
        && error.code === (status === 429 ? "rate_limited" : "authorization")
        && !error.message.includes("detail")
        && !error.message.includes("secret"),
    );
  }
});

test("5xx and network failures retry once, while malformed JSON fails without provider details", async () => {
  let attempts = 0;
  const recovered = await fetchStravaActivitiesPage(
    { accessToken: "secret", after: 1, page: 1, perPage: 100 },
    async () => {
      attempts += 1;
      return new Response(JSON.stringify(attempts === 1 ? {} : [activity]), { status: attempts === 1 ? 503 : 200 });
    },
  );
  assert.equal(recovered.length, 1);
  assert.equal(attempts, 2);

  attempts = 0;
  await assert.rejects(
    () => fetchStravaActivitiesPage(
      { accessToken: "secret", after: 1, page: 1, perPage: 100 },
      async () => {
        attempts += 1;
        throw new Error("socket with secret");
      },
    ),
    (error: unknown) => error instanceof StravaActivityTransportError && error.code === "network",
  );
  assert.equal(attempts, 2);

  await assert.rejects(
    () => fetchStravaActivitiesPage(
      { accessToken: "secret", after: 1, page: 1, perPage: 100 },
      async () => new Response("not-json", { status: 200 }),
    ),
    (error: unknown) => error instanceof StravaActivityTransportError && error.code === "malformed_response",
  );
});
