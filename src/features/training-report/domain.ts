import {
  complianceCounts,
  isExpectedPrescription,
  prescriptionComplianceState,
  type ComplianceCounts,
  type EvaluationProgram,
  type EvaluationWeek,
} from "@/src/features/evaluation/analytics";
import { COMPLIANCE_STATES } from "@/src/features/validation/engine/compliance";
import { RUNNING_TRAINING_MENUS } from "@/src/features/running-analytics/domain";
import {
  actualDistanceCoverage,
  actualDurationCoverage,
  plannedDistanceCoverage,
  plannedDurationCoverage,
  type MetricCoverage,
  type TrainingInsightActivity,
  type TrainingInsightComponent,
} from "@/src/features/training-insights/domain";

type ReportPrescription = Omit<EvaluationWeek["prescriptions"][number], "components"> & {
  components: Array<{
    id: string;
    sequence_order: number;
    target_distance_m: number | null;
    target_duration_sec: number | null;
    repetitions: number | null;
    distance_per_rep_m: number | null;
  }>;
};

export type ReportWeek = Omit<EvaluationWeek, "prescriptions"> & {
  prescriptions: ReportPrescription[];
  review: { fulfillment_rating: number | null; coach_comment: string | null } | null;
};

export type ReportProgram = Omit<EvaluationProgram, "weeks"> & { weeks: ReportWeek[] };

export type CoachProgramReport = {
  context: {
    programId: string;
    programName: string;
    programStatus: string;
    athleteId: string;
    athleteName: string;
    raceName: string;
    raceDate: string;
    targetFinishTimeSec: number;
    programStartDate: string;
    programEndDate: string;
  };
  summary: {
    compliance: ComplianceCounts;
    averageWeeklyFulfillmentPercent: number | null;
    totalClaimedRunningDistance: MetricCoverage;
    totalClaimedRunningDuration: MetricCoverage;
  };
  weeks: Array<{
    id: string;
    weekNumber: number;
    phase: string | null;
    planningStatus: string;
    startDate: string;
    endDate: string;
    prescribedRunningDistance: MetricCoverage;
    actualClaimedRunningDistance: MetricCoverage;
    prescribedRunningDuration: MetricCoverage;
    actualClaimedRunningDuration: MetricCoverage;
    fulfillmentPercent: number | null;
    outcomes: ComplianceCounts;
    fulfillmentRating: number | null;
    coachComment: string | null;
      sessions: Array<{
        id: string;
        scheduledDate: string;
        trainingMenu: string;
        title: string;
        targetDistance: MetricCoverage;
        targetDuration: MetricCoverage;
        outcome: keyof ComplianceCounts;
      }>;
  }>;
};

function emptyCounts(): ComplianceCounts {
  return Object.fromEntries(COMPLIANCE_STATES.map((state) => [state, 0])) as ComplianceCounts;
}

function isRunningMenu(value: string) {
  return RUNNING_TRAINING_MENUS.includes(value as (typeof RUNNING_TRAINING_MENUS)[number]);
}

function insightComponents(components: ReportPrescription["components"]): TrainingInsightComponent[] {
  return components.map((component) => ({
    target_distance_m: component.target_distance_m,
    target_duration_sec: component.target_duration_sec,
    repetitions: component.repetitions,
    distance_per_rep_m: component.distance_per_rep_m,
  }));
}

function runningActivities(prescriptions: ReportWeek["prescriptions"]): TrainingInsightActivity[] {
  return prescriptions.flatMap((prescription) => {
    const submittedClaim = prescription.claims.find((claim) => claim.status === "SUBMITTED");
    return (submittedClaim?.evidence ?? [])
      .map(({ activity }) => activity)
      .filter((activity) => activity.sport_type === "RUNNING")
      .map((activity) => ({
        id: activity.id,
        distance_m: activity.distance_m,
        duration_sec: activity.duration_sec,
      }));
  });
}

function weeklyMetrics(week: ReportWeek, cancelledAt?: string | null) {
  const expectedRunning = week.prescriptions.filter((prescription) =>
    isExpectedPrescription(prescription, cancelledAt) && isRunningMenu(prescription.training_menu),
  );
  const activities = runningActivities(expectedRunning);
  return {
    prescribedRunningDistance: plannedDistanceCoverage(expectedRunning.flatMap((prescription) => insightComponents(prescription.components))),
    actualClaimedRunningDistance: actualDistanceCoverage(activities),
    prescribedRunningDuration: plannedDurationCoverage(expectedRunning.flatMap((prescription) => insightComponents(prescription.components))),
    actualClaimedRunningDuration: actualDurationCoverage(activities),
    activities,
  };
}

export function buildCoachProgramReport(
  program: ReportProgram,
  today: string,
  claimStates = new Map<string, string | null>(),
): CoachProgramReport {
  const weeks = [...program.weeks]
    .sort((left, right) => left.start_date.localeCompare(right.start_date) || left.week_number - right.week_number)
    .map((week) => {
      const metrics = weeklyMetrics(week, program.cancelled_at);
      const published = week.planning_status === "PUBLISHED";
      const outcomes = published
        ? complianceCounts(week.prescriptions, today, claimStates, program.tracking_start_date, program.cancelled_at)
        : { ...emptyCounts(), DRAFT: week.prescriptions.length };
      return {
        id: week.id,
        weekNumber: week.week_number,
        phase: week.phase || null,
        planningStatus: week.planning_status,
        startDate: week.start_date,
        endDate: week.end_date,
        prescribedRunningDistance: metrics.prescribedRunningDistance,
        actualClaimedRunningDistance: metrics.actualClaimedRunningDistance,
        prescribedRunningDuration: metrics.prescribedRunningDuration,
        actualClaimedRunningDuration: metrics.actualClaimedRunningDuration,
        fulfillmentPercent: metrics.prescribedRunningDistance.completeness !== "COMPLETE"
          || metrics.actualClaimedRunningDistance.completeness !== "COMPLETE"
          || metrics.prescribedRunningDistance.value === null
          || metrics.actualClaimedRunningDistance.value === null
          || metrics.prescribedRunningDistance.value === 0
          ? null
          : (metrics.actualClaimedRunningDistance.value / metrics.prescribedRunningDistance.value) * 100,
        outcomes,
        fulfillmentRating: week.review?.fulfillment_rating ?? null,
        coachComment: week.review?.coach_comment ?? null,
        sessions: [...week.prescriptions]
          .sort((left, right) => left.scheduled_date.localeCompare(right.scheduled_date) || left.id.localeCompare(right.id))
          .map((prescription) => ({
            id: prescription.id,
            scheduledDate: prescription.scheduled_date,
            trainingMenu: prescription.training_menu,
            title: prescription.title,
            targetDistance: plannedDistanceCoverage(insightComponents(prescription.components)),
            targetDuration: plannedDurationCoverage(insightComponents(prescription.components)),
            outcome: published
              ? prescriptionComplianceState(
                  prescription,
                  today,
                  claimStates.has(prescription.id) ? claimStates.get(prescription.id) : undefined,
                  program.tracking_start_date,
                )
              : "DRAFT",
          })),
      };
    });
  const allActivities = program.weeks.flatMap((week) => weeklyMetrics(week, program.cancelled_at).activities);
  const completedWeeks = weeks.filter((week) => week.endDate < today && week.fulfillmentPercent !== null);

  return {
    context: {
      programId: program.id,
      programName: program.name,
      programStatus: program.status,
      athleteId: program.race_goal.athlete_id,
      athleteName: program.race_goal.athlete.full_name ?? "Athlete",
      raceName: program.race_goal.race.name,
      raceDate: program.race_goal.race.event_date,
      targetFinishTimeSec: program.race_goal.target_finish_time_sec,
      programStartDate: program.start_date,
      programEndDate: program.end_date,
    },
    summary: {
      compliance: complianceCounts(
        program.weeks.filter((week) => week.planning_status === "PUBLISHED").flatMap((week) => week.prescriptions),
        today,
        claimStates,
        program.tracking_start_date,
        program.cancelled_at,
      ),
      averageWeeklyFulfillmentPercent: completedWeeks.length === 0
        ? null
        : completedWeeks.reduce((sum, week) => sum + (week.fulfillmentPercent ?? 0), 0) / completedWeeks.length,
      totalClaimedRunningDistance: actualDistanceCoverage(allActivities),
      totalClaimedRunningDuration: actualDurationCoverage(allActivities),
    },
    weeks,
  };
}
