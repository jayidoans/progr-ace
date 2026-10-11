import {
  complianceCounts,
  currentWeekFromPrescriptionDates,
  isExpectedPrescription,
  utcCalendarWeek,
  type EvaluationProgram,
  type EvaluationWeek,
} from "@/src/features/evaluation/analytics";
import { RUNNING_TRAINING_MENUS } from "@/src/features/running-analytics/domain";

import {
  actualDistanceCoverage,
  plannedDistanceCoverage,
} from "./domain";
import type {
  CoachTrainingInsightsSummary,
  ProgramTrainingInsights,
  TrainingInsightOutcomeCounts,
  TrainingInsightComponent,
  TrainingInsightWeek,
} from "./types";

export type TrainingInsightsProgram = EvaluationProgram;

export function fourWeekWindowStart(today: string) {
  const date = new Date(`${utcCalendarWeek(today).startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 21);
  return date.toISOString().slice(0, 10);
}

function isRunningMenu(value: string) {
  return RUNNING_TRAINING_MENUS.includes(value as (typeof RUNNING_TRAINING_MENUS)[number]);
}

function outcomesForWeek(
  program: TrainingInsightsProgram,
  week: EvaluationWeek,
  today: string,
  claimStates: Map<string, string | null>,
) {
  return complianceCounts(
    week.prescriptions.filter((prescription) => isExpectedPrescription(prescription, program.cancelled_at)),
    today,
    claimStates,
    program.tracking_start_date,
    program.cancelled_at,
  ) as TrainingInsightOutcomeCounts;
}

function projectWeek(
  program: TrainingInsightsProgram,
  week: EvaluationWeek,
  today: string,
  claimStates: Map<string, string | null>,
): TrainingInsightWeek {
  const expectedRunning = week.prescriptions.filter((prescription) =>
    isExpectedPrescription(prescription, program.cancelled_at) && isRunningMenu(prescription.training_menu),
  );
  const activities = expectedRunning.flatMap((prescription) => {
    const submittedClaim = prescription.claims.find((claim) => claim.status === "SUBMITTED");
    return (submittedClaim?.evidence ?? [])
      .map(({ activity }) => activity)
      .filter((activity) => activity.sport_type === "RUNNING");
  });
  const outcomes = outcomesForWeek(program, week, today, claimStates);

  return {
    id: week.id,
    weekNumber: week.week_number,
    phase: week.phase,
    startDate: week.start_date,
    endDate: week.end_date,
    plannedDistance: plannedDistanceCoverage(
      expectedRunning.flatMap((prescription) => prescription.components.map((component) => {
        const source = component as typeof component & TrainingInsightComponent;
        return {
          target_distance_m: source.target_distance_m,
          target_duration_sec: source.target_duration_sec,
          repetitions: source.repetitions,
          distance_per_rep_m: source.distance_per_rep_m,
        };
      })),
    ),
    actualDistance: actualDistanceCoverage(activities),
    outcomes,
    needsReviewCount: outcomes.NEEDS_REVIEW,
    missedCount: outcomes.MISSED,
  };
}

export function projectProgramTrainingInsights(
  program: TrainingInsightsProgram,
  today: string,
  claimStates = new Map<string, string | null>(),
): ProgramTrainingInsights {
  const boundedWeeks = program.weeks
    .filter((week) => week.planning_status === "PUBLISHED" && week.start_date <= today)
    .sort((left, right) => left.start_date.localeCompare(right.start_date) || left.id.localeCompare(right.id))
    .slice(-4);
  const boundedProgram = { ...program, weeks: boundedWeeks };
  const currentWeek = currentWeekFromPrescriptionDates(boundedProgram, today);
  const projectedWeeks = boundedWeeks.map((week) => projectWeek(program, week, today, claimStates));

  return {
    program: {
      id: program.id,
      name: program.name,
      status: program.status,
      athleteId: program.race_goal.athlete_id,
      coachId: program.created_by,
    },
    currentWeek: currentWeek
      ? projectedWeeks.find((week) => week.id === currentWeek.id) ?? null
      : null,
    fourWeekTrend: projectedWeeks,
    timezone: "UTC",
  };
}

export function projectCoachTrainingInsights(
  programs: TrainingInsightsProgram[],
  today: string,
  claimStates = new Map<string, string | null>(),
): CoachTrainingInsightsSummary[] {
  return programs
    .map((program) => {
      const insights = projectProgramTrainingInsights(program, today, claimStates);
      return {
        athlete: {
          id: program.race_goal.athlete_id,
          name: program.race_goal.athlete.full_name,
        },
        program: insights.program,
        currentWeek: insights.currentWeek,
        trend: insights.fourWeekTrend.map((week) => ({
          startDate: week.startDate,
          endDate: week.endDate,
          plannedDistance: week.plannedDistance,
          actualDistance: week.actualDistance,
        })),
      };
    })
    .sort((left, right) =>
      (right.currentWeek?.needsReviewCount ?? 0) - (left.currentWeek?.needsReviewCount ?? 0)
      || (right.currentWeek?.missedCount ?? 0) - (left.currentWeek?.missedCount ?? 0)
      || (left.athlete.name ?? "Athlete").localeCompare(right.athlete.name ?? "Athlete"),
    );
}
