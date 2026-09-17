import assert from "node:assert/strict";
import { test } from "node:test";

import { activityFormSchema, stravaActivityContextSchema } from "../schemas";

test("Strava context accepts nullable or valid RPE and trims Notes", () => {
  assert.deepEqual(
    stravaActivityContextSchema.parse({
      activityId: "97000000-0000-4000-8000-000000000001",
      rpe: "7",
      notes: "  Legs felt heavy.  ",
    }),
    {
      activityId: "97000000-0000-4000-8000-000000000001",
      rpe: 7,
      notes: "Legs felt heavy.",
    },
  );
  assert.equal(
    stravaActivityContextSchema.parse({
      activityId: "97000000-0000-4000-8000-000000000001",
      rpe: "",
      notes: "",
    }).rpe,
    null,
  );
});

test("Strava context rejects RPE outside the existing 1 to 10 scale", () => {
  for (const rpe of ["0", "11"]) {
    assert.equal(
      stravaActivityContextSchema.safeParse({
        activityId: "97000000-0000-4000-8000-000000000001",
        rpe,
        notes: "",
      }).success,
      false,
    );
  }
});

test("manual Activity form continues accepting its existing RPE and Notes fields", () => {
  const parsed = activityFormSchema.safeParse({
    name: "Manual run",
    sportType: "RUNNING",
    startedAt: "2026-09-17T06:00",
    timezoneOffsetMinutes: "-420",
    distanceKm: "5",
    duration: "30:00",
    averageHrBpm: "",
    maxHrBpm: "",
    elevationGainM: "",
    rpe: "6",
    notes: "Manual context",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.rpe, 6);
    assert.equal(parsed.data.notes, "Manual context");
  }
});
