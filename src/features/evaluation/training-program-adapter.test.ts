import assert from "node:assert/strict";
import { test } from "node:test";

import type { TrainingProgramDetail } from "@/src/features/training/queries";

import { complianceCounts, publishedEvaluationWeeks } from "./analytics";
import { evaluationProgramFromTrainingProgram } from "./training-program-adapter";

const sourceProgram = {
  id: "program-1",
  name: "Historical Program",
  status: "PUBLISHED",
  start_date: "2026-08-01",
  end_date: "2026-10-31",
  tracking_start_date: "2026-09-20",
  cancelled_at: null,
  cancelled_by: null,
  cancellation_reason: null,
  created_by: "coach-1",
  race_goal: {
    id: "goal-1",
    athlete_id: "athlete-1",
    target_finish_time_sec: 14400,
    status: "ACTIVE",
    completed_at: null,
    completed_by: null,
    athlete: { id: "athlete-1", full_name: "Athlete", email: null },
    race: { id: "race-1", name: "Race", event_date: "2026-12-06", distance_m: 42195, location: null },
  },
  weeks: [
    {
      id: "published-week",
      week_number: 1,
      phase: "Base",
      planning_status: "PUBLISHED",
      start_date: "2026-09-14",
      end_date: "2026-09-20",
      prescriptions: [
        {
          id: "historical-session",
          scheduled_date: "2026-09-16",
          title: "Historical easy",
          training_menu: "EASY",
          components: [{ id: "component-1", sequence_order: 1, target_distance_m: 5000 }],
          claim: null,
        },
      ],
    },
    {
      id: "draft-week",
      week_number: 2,
      phase: "Build",
      planning_status: "DRAFT",
      start_date: "2026-09-21",
      end_date: "2026-09-27",
      prescriptions: [
        {
          id: "draft-session",
          scheduled_date: "2026-09-22",
          title: "Draft easy",
          training_menu: "EASY",
          components: [{ id: "component-2", sequence_order: 1, target_distance_m: 5000 }],
          claim: null,
        },
      ],
    },
  ],
} as unknown as TrainingProgramDetail;

test("shared Training Program data preserves M10 published-week and adoption semantics", () => {
  const evaluationProgram = evaluationProgramFromTrainingProgram(sourceProgram);
  const published = publishedEvaluationWeeks(evaluationProgram.weeks);

  assert.deepEqual(published.map((week) => week.id), ["published-week"]);
  assert.equal(
    complianceCounts(published.flatMap((week) => week.prescriptions), "2026-09-23", new Map(), evaluationProgram.tracking_start_date).NOT_CLAIMED,
    1,
  );
  assert.equal(
    complianceCounts(published.flatMap((week) => week.prescriptions), "2026-09-23", new Map(), evaluationProgram.tracking_start_date).MISSED,
    0,
  );
});
