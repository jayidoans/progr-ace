import type { Tables } from "@/src/types/database";
import { componentTargetDistanceM } from "@/src/features/dashboard/weekly-stats";
import {
  cancellationEffectiveDate,
  complianceCounts,
  isExpectedPrescription,
  prescriptionComplianceState,
  type ComplianceCounts,
} from "@/src/features/evaluation/analytics";

export const RUNNING_TRAINING_MENUS = ["EASY", "MEDIUM", "LONG", "SPEED"] as const;
export type RunningTrainingMenu = (typeof RUNNING_TRAINING_MENUS)[number];

export type RunningAnalyticsActivity = Pick<
  Tables<"activities">,
  | "id"
  | "name"
  | "source"
  | "sport_type"
  | "started_at"
  | "distance_m"
  | "duration_sec"
  | "average_hr_bpm"
  | "rpe"
>;

export type RunningAnalyticsClaim = Pick<
  Tables<"training_claims">,
  "id" | "status" | "submitted_at"
> & {
  validation: Pick<Tables<"claim_validations">, "result" | "evaluation_source"> | null;
  evidence: { activity: RunningAnalyticsActivity }[];
};

export type RunningAnalyticsComponent = Pick<
  Tables<"prescription_components">,
  | "id"
  | "component_type"
  | "sequence_order"
  | "target_distance_m"
  | "target_duration_sec"
  | "repetitions"
  | "distance_per_rep_m"
  | "recovery_duration_sec"
  | "target_pace_min_sec_per_km"
  | "target_pace_max_sec_per_km"
  | "instruction"
>;

export type RunningAnalyticsPrescription = Pick<
  Tables<"training_prescriptions">,
  "id" | "scheduled_date" | "training_menu" | "title" | "description"
> & {
  components: RunningAnalyticsComponent[];
  claims: RunningAnalyticsClaim[];
};

export type RunningAnalyticsWeekSource = Pick<
  Tables<"training_weeks">,
  "id" | "week_number" | "phase" | "planning_status" | "start_date" | "end_date"
> & { prescriptions: RunningAnalyticsPrescription[] };

export type RunningAnalyticsProgramSource = Pick<
  Tables<"training_programs">,
  "id" | "name" | "status" | "start_date" | "end_date" | "created_by"
> & {
  tracking_start_date?: string | null;
  cancelled_at?: string | null;
  race_goal: Pick<Tables<"athlete_race_goals">, "id" | "athlete_id" | "status"> & {
    athlete: Pick<Tables<"profiles">, "id" | "full_name" | "email">;
    race: Pick<Tables<"races">, "id" | "name" | "event_date">;
  };
  weeks: RunningAnalyticsWeekSource[];
};

export type RunningActivityResponse = RunningAnalyticsActivity;

export type RunningSessionTrend = {
  prescriptionId: string;
  weekId: string;
  weekNumber: number;
  phase: string | null;
  scheduledDate: string;
  trainingMenu: RunningTrainingMenu;
  title: string;
  description: string | null;
  prescribedComponents: RunningAnalyticsComponent[];
  prescribedDistanceM: number | null;
  prescribedDurationSec: number | null;
  outcome: keyof ComplianceCounts;
  validationResult: string | null;
  claimId: string | null;
  actualRunningDistanceM: number | null;
  actualRunningDurationSec: number | null;
  wholeSessionPaceSecPerKm: number | null;
  singleActivityAverageHrBpm: number | null;
  singleActivityRpe: number | null;
  runningActivities: RunningActivityResponse[];
};

export type WeeklyRunningAnalytics = {
  weekId: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  phase: string | null;
  isCurrentWeek: boolean;
  prescribedRunningDistanceM: number | null;
  actualClaimedRunningDistanceM: number | null;
  durationOnlyRunningPrescriptionCount: number;
  durationOnlyRunningComponentCount: number;
  runningActivityCount: number;
  outcomes: ComplianceCounts;
};

export type ProgramRunningAnalytics = {
  context: {
    programId: string;
    programName: string;
    programStatus: string;
    programStartDate: string;
    programEndDate: string;
    programCancelledAt: string | null;
    athleteId: string;
    athleteName: string;
    athleteEmail: string | null;
    raceGoalId: string;
    raceGoalStatus: string;
    raceName: string;
    raceDate: string;
    currentWeekNumber: number | null;
  };
  weeks: WeeklyRunningAnalytics[];
  sessions: RunningSessionTrend[];
};

function isRunningMenu(value: string): value is RunningTrainingMenu {
  return RUNNING_TRAINING_MENUS.includes(value as RunningTrainingMenu);
}

function sumKnown(values: (number | null)[]) {
  const known = values.filter((value): value is number => value !== null);
  return known.length === 0 ? null : known.reduce((sum, value) => sum + value, 0);
}

function prescribedDistance(components: RunningAnalyticsComponent[]) {
  return sumKnown(components.map(componentTargetDistanceM));
}

function prescribedDuration(components: RunningAnalyticsComponent[]) {
  return sumKnown(components.map((component) => component.target_duration_sec));
}

function submittedRunningActivities(prescription: RunningAnalyticsPrescription) {
  const submittedClaim = prescription.claims.find((claim) => claim.status === "SUBMITTED") ?? null;
  const activities = new Map<string, RunningAnalyticsActivity>();
  submittedClaim?.evidence.forEach(({ activity }) => {
    if (activity.sport_type === "RUNNING") activities.set(activity.id, activity);
  });
  return {
    claim: submittedClaim,
    activities: [...activities.values()].sort(
      (left, right) => left.started_at.localeCompare(right.started_at) || left.id.localeCompare(right.id),
    ),
  };
}

function hasSubmittedClaim(prescription: RunningAnalyticsPrescription) {
  return prescription.claims.some((claim) => claim.status === "SUBMITTED");
}

function sessionTrend(
  week: RunningAnalyticsWeekSource,
  prescription: RunningAnalyticsPrescription,
  today: string,
  claimStates: Map<string, string | null>,
  trackingStartDate?: string | null,
): RunningSessionTrend | null {
  if (!isRunningMenu(prescription.training_menu)) return null;
  const { claim, activities } = submittedRunningActivities(prescription);
  const distance = sumKnown(activities.map((activity) => activity.distance_m));
  const duration = sumKnown(activities.map((activity) => activity.duration_sec));
  const completePaceInputs = activities.length > 0 && activities.every(
    (activity) =>
      activity.distance_m !== null && activity.distance_m > 0
      && activity.duration_sec !== null && activity.duration_sec > 0,
  );
  const wholeSessionPaceSecPerKm = completePaceInputs && distance !== null && duration !== null
    ? duration / (distance / 1000)
    : null;
  const singleActivity = activities.length === 1 ? activities[0] : null;

  return {
    prescriptionId: prescription.id,
    weekId: week.id,
    weekNumber: week.week_number,
    phase: week.phase || null,
    scheduledDate: prescription.scheduled_date,
    trainingMenu: prescription.training_menu,
    title: prescription.title,
    description: prescription.description,
    prescribedComponents: [...prescription.components].sort(
      (left, right) => left.sequence_order - right.sequence_order,
    ),
    prescribedDistanceM: prescribedDistance(prescription.components),
    prescribedDurationSec: prescribedDuration(prescription.components),
    outcome: prescriptionComplianceState(
      prescription,
      today,
      claimStates.has(prescription.id) ? claimStates.get(prescription.id) : undefined,
      trackingStartDate,
    ),
    validationResult: claim?.validation?.result ?? null,
    claimId: claim?.id ?? null,
    actualRunningDistanceM: distance,
    actualRunningDurationSec: duration,
    wholeSessionPaceSecPerKm,
    singleActivityAverageHrBpm: singleActivity?.average_hr_bpm ?? null,
    singleActivityRpe: singleActivity?.rpe ?? null,
    runningActivities: activities,
  };
}

function weeklyAnalytics(
  week: RunningAnalyticsWeekSource,
  today: string,
  claimStates: Map<string, string | null>,
  trackingStartDate?: string | null,
  cancelledAt?: string | null,
): WeeklyRunningAnalytics {
  const cancellationDate = cancellationEffectiveDate(cancelledAt);
  const expectedPrescriptions = week.prescriptions.filter((prescription) =>
    isExpectedPrescription(prescription, cancelledAt),
  );
  const runningPrescriptions = expectedPrescriptions.filter((item) => isRunningMenu(item.training_menu));
  const prescribedDistances = runningPrescriptions.flatMap((prescription) =>
    prescription.components.map(componentTargetDistanceM),
  );
  const durationOnlyRunningComponentCount = runningPrescriptions.reduce(
    (count, prescription) => count + prescription.components.filter(
      (component) => componentTargetDistanceM(component) === null
        && component.target_duration_sec !== null,
    ).length,
    0,
  );
  const durationOnlyRunningPrescriptionCount = runningPrescriptions.filter((prescription) =>
    prescribedDistance(prescription.components) === null
      && prescription.components.some((component) => component.target_duration_sec !== null),
  ).length;
  const uniqueActivities = new Map<string, RunningAnalyticsActivity>();
  week.prescriptions.forEach((prescription) => {
    submittedRunningActivities(prescription).activities.forEach((activity) => {
      uniqueActivities.set(activity.id, activity);
    });
  });

  return {
    weekId: week.id,
    weekNumber: week.week_number,
    startDate: week.start_date,
    endDate: week.end_date,
    phase: week.phase || null,
    isCurrentWeek: week.start_date <= today && today <= week.end_date
      && (cancellationDate === null || today < cancellationDate),
    prescribedRunningDistanceM: sumKnown(prescribedDistances),
    actualClaimedRunningDistanceM: sumKnown(
      [...uniqueActivities.values()].map((activity) => activity.distance_m),
    ),
    durationOnlyRunningPrescriptionCount,
    durationOnlyRunningComponentCount,
    runningActivityCount: uniqueActivities.size,
    outcomes: complianceCounts(
      expectedPrescriptions,
      today,
      claimStates,
      trackingStartDate,
      cancelledAt,
    ),
  };
}

export function buildProgramRunningAnalytics(
  source: RunningAnalyticsProgramSource,
  today: string,
  claimStates = new Map<string, string | null>(),
): ProgramRunningAnalytics {
  const cancellationDate = cancellationEffectiveDate(source.cancelled_at);
  const weeks = source.weeks
    .filter((week) =>
      week.planning_status === "PUBLISHED"
      && week.start_date <= today
      && (
        cancellationDate === null
        || week.start_date < cancellationDate
        || week.prescriptions.some(hasSubmittedClaim)
      ),
    )
    .sort((left, right) => left.start_date.localeCompare(right.start_date) || left.week_number - right.week_number);
  const sessions = weeks.flatMap((week) => {
    const trends = week.prescriptions
      .filter((prescription) =>
        isExpectedPrescription(prescription, source.cancelled_at)
        || hasSubmittedClaim(prescription),
      )
      .map((prescription) => sessionTrend(week, prescription, today, claimStates, source.tracking_start_date))
      .filter((trend): trend is RunningSessionTrend => trend !== null)
      .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate) || left.prescriptionId.localeCompare(right.prescriptionId));
    return trends;
  });
  const weekly = weeks.map((week) => weeklyAnalytics(
    week,
    today,
    claimStates,
    source.tracking_start_date,
    source.cancelled_at,
  ));
  const currentWeek = weekly.find((week) => week.isCurrentWeek) ?? null;

  return {
    context: {
      programId: source.id,
      programName: source.name,
      programStatus: source.status,
      programStartDate: source.start_date,
      programEndDate: source.end_date,
      programCancelledAt: source.cancelled_at ?? null,
      athleteId: source.race_goal.athlete_id,
      athleteName: source.race_goal.athlete.full_name ?? "Athlete",
      athleteEmail: source.race_goal.athlete.email,
      raceGoalId: source.race_goal.id,
      raceGoalStatus: source.race_goal.status,
      raceName: source.race_goal.race.name,
      raceDate: source.race_goal.race.event_date,
      currentWeekNumber: currentWeek?.weekNumber ?? null,
    },
    weeks: weekly,
    sessions,
  };
}
