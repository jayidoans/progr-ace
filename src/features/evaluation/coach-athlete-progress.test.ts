import assert from "node:assert/strict";
import test from "node:test";

import type { EvaluationProgram } from "./analytics";
import { groupCoachProgramsByGoal } from "./coach-athlete-progress";

function program(id: string, goalId: string, startDate: string): EvaluationProgram {
  return {
    id,
    name: id,
    status: "PUBLISHED",
    start_date: startDate,
    end_date: "2026-12-06",
    created_by: "coach-1",
    race_goal: {
      id: goalId,
      athlete_id: "athlete-1",
      status: "ACTIVE",
      target_finish_time_sec: 14400,
      completed_at: null,
      completed_by: null,
      athlete: { id: "athlete-1", full_name: "Athlete", email: "athlete@example.test" },
      race: { id: "race-1", name: "Race", event_date: "2026-12-06", distance_m: 42195 },
    },
    weeks: [],
  };
}

test("programs remain grouped by Race Goal and newest published program is selected first", () => {
  const grouped = groupCoachProgramsByGoal([
    program("older", "goal-1", "2026-08-01"),
    program("other-goal", "goal-2", "2026-09-01"),
    program("newer", "goal-1", "2026-09-01"),
  ]);
  assert.deepEqual(grouped.get("goal-1")?.map((item) => item.id), ["newer", "older"]);
  assert.deepEqual(grouped.get("goal-2")?.map((item) => item.id), ["other-goal"]);
});
