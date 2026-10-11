import {
  complianceCounts,
  isExpectedPrescription,
  prescriptionComplianceState,
  type ComplianceCounts,
  type EvaluationProgram,
  type EvaluationWeek,
} from "@/src/features/evaluation/analytics";
import { COMPLIANCE_STATES } from "@/src/features/validation/engine/compliance";

export type ReportWeek = EvaluationWeek & {
  review: { fulfillment_rating: number | null; coach_comment: string | null } | null;
};

export type ReportProgram = EvaluationProgram & { weeks: ReportWeek[] };

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
    totalClaimedRunningDistanceM: number | null;
    totalClaimedRunningDurationSec: number | null;
  };
  weeks: Array<{
    id: string;
    weekNumber: number;
    phase: string | null;
    planningStatus: string;
    startDate: string;
    endDate: string;
    prescribedRunningDistanceM: number | null;
    actualClaimedRunningDistanceM: number | null;
    fulfillmentPercent: number | null;
    outcomes: ComplianceCounts;
    fulfillmentRating: number | null;
    coachComment: string | null;
    sessions: Array<{
      id: string;
      scheduledDate: string;
      trainingMenu: string;
      title: string;
      outcome: keyof ComplianceCounts;
    }>;
  }>;
};

function emptyCounts(): ComplianceCounts {
  return Object.fromEntries(COMPLIANCE_STATES.map((state) => [state, 0])) as ComplianceCounts;
}

function uniqueRunningActivities(week: EvaluationWeek, cancelledAt?: string | null) {
  const activities = new Map<string, (typeof week.prescriptions)[number]["claims"][number]["evidence"][number]["activity"]>();
  week.prescriptions.forEach((prescription) => {
    if (!isExpectedPrescription(prescription, cancelledAt)) return;
    prescription.claims.find((claim) => claim.status === "SUBMITTED")?.evidence.forEach(({ activity }) => {
      if (activity.sport_type === "RUNNING") activities.set(activity.id, activity);
    });
  });
  return [...activities.values()];
}

function weekDistance(week: EvaluationWeek, cancelledAt?: string | null) {
  const target = week.prescriptions.reduce((total, prescription) => {
    if (!isExpectedPrescription(prescription, cancelledAt) || !["EASY", "MEDIUM", "LONG", "SPEED"].includes(prescription.training_menu)) return total;
    const distances = prescription.components.map((component) => component.target_distance_m);
    if (distances.length === 0 || distances.some((distance) => distance === null)) return total;
    return { value: total.value + (distances as number[]).reduce((sum, distance) => sum + distance, 0), count: total.count + 1 };
  }, { value: 0, count: 0 });
  const activities = uniqueRunningActivities(week, cancelledAt);
  const distances = activities.map((activity) => activity.distance_m).filter((distance): distance is number => distance !== null);
  return {
    prescribedRunningDistanceM: target.count > 0 ? target.value : null,
    actualClaimedRunningDistanceM: distances.length > 0 ? distances.reduce((sum, distance) => sum + distance, 0) : null,
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
      const distance = weekDistance(week, program.cancelled_at);
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
        prescribedRunningDistanceM: distance.prescribedRunningDistanceM,
        actualClaimedRunningDistanceM: distance.actualClaimedRunningDistanceM,
        fulfillmentPercent: distance.prescribedRunningDistanceM === null || distance.actualClaimedRunningDistanceM === null
          ? null
          : (distance.actualClaimedRunningDistanceM / distance.prescribedRunningDistanceM) * 100,
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
  const allActivities = new Map<string, ReturnType<typeof weekDistance>["activities"][number]>();
  weeks.forEach((week) => {
    const sourceWeek = program.weeks.find((item) => item.id === week.id);
    if (!sourceWeek) return;
    weekDistance(sourceWeek, program.cancelled_at).activities.forEach((activity) => allActivities.set(activity.id, activity));
  });
  const knownDistances = [...allActivities.values()].map((activity) => activity.distance_m).filter((distance): distance is number => distance !== null);
  const knownDurations = [...allActivities.values()].map((activity) => activity.duration_sec).filter((duration): duration is number => duration !== null);
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
      totalClaimedRunningDistanceM: knownDistances.length === 0 ? null : knownDistances.reduce((sum, distance) => sum + distance, 0),
      totalClaimedRunningDurationSec: knownDurations.length === 0 ? null : knownDurations.reduce((sum, duration) => sum + duration, 0),
    },
    weeks,
  };
}
