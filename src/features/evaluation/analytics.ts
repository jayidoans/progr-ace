import type { Tables } from "@/src/types/database";
import {
  COMPLIANCE_STATES,
  deriveComplianceState,
  type ComplianceState,
} from "@/src/features/validation/engine/compliance";

const DAY_MS = 24 * 60 * 60 * 1000;

export type EvaluationActivity = Pick<
  Tables<"activities">,
  "id" | "distance_m" | "duration_sec" | "rpe" | "source" | "sport_type" | "started_at"
>;

export type EvaluationClaim = Pick<
  Tables<"training_claims">,
  "id" | "status" | "submitted_at"
> & {
  validation: Pick<Tables<"claim_validations">, "result" | "evaluation_source"> | null;
  evidence: { activity: EvaluationActivity }[];
};

export type EvaluationPrescription = Pick<
  Tables<"training_prescriptions">,
  "id" | "scheduled_date" | "title" | "training_menu"
> & {
  components: Pick<
    Tables<"prescription_components">,
    "id" | "target_distance_m" | "sequence_order"
  >[];
  claims: EvaluationClaim[];
};

export type EvaluationWeek = Pick<
  Tables<"training_weeks">,
  "id" | "week_number" | "phase" | "start_date" | "end_date"
> & { prescriptions: EvaluationPrescription[] };

export type EvaluationProgram = Pick<
  Tables<"training_programs">,
  "id" | "name" | "status" | "start_date" | "end_date" | "created_by"
> & {
  race_goal: Pick<Tables<"athlete_race_goals">, "id" | "athlete_id" | "status"> & {
    athlete: Pick<Tables<"profiles">, "id" | "full_name" | "email">;
    race: Pick<Tables<"races">, "id" | "name" | "event_date" | "distance_m">;
  };
  weeks: EvaluationWeek[];
};

export type ComplianceCounts = Record<ComplianceState, number>;

export function utcCalendarWeek(today: string) {
  const current = new Date(`${today}T00:00:00Z`);
  const mondayOffset = (current.getUTCDay() + 6) % 7;
  const start = new Date(current.valueOf() - mondayOffset * DAY_MS);
  const end = new Date(start.valueOf() + 6 * DAY_MS);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export function daysUntilDate(date: string, today: string) {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS,
  );
}

export function currentWeekFromPrescriptionDates(program: EvaluationProgram, today: string) {
  const { startDate, endDate } = utcCalendarWeek(today);
  return (
    [...program.weeks]
      .sort((left, right) => left.week_number - right.week_number)
      .find((week) =>
        week.prescriptions.some(
          (prescription) =>
            prescription.scheduled_date >= startDate && prescription.scheduled_date <= endDate,
        ),
      ) ?? null
  );
}

export function prescriptionTargetDistanceM(prescription: EvaluationPrescription) {
  if (prescription.training_menu === "STRENGTH" || prescription.components.length === 0) return null;
  const distances = prescription.components.map((component) => component.target_distance_m);
  if (distances.some((distance) => distance === null)) return null;
  return (distances as number[]).reduce((total, distance) => total + distance, 0);
}

export function prescriptionComplianceState(
  prescription: EvaluationPrescription,
  today: string,
  claimStatus?: string | null,
) {
  const claim = prescription.claims[0] ?? null;
  const status = claimStatus === undefined ? claim?.status ?? null : claimStatus;
  return deriveComplianceState(
    prescription.scheduled_date,
    status
      ? { status, validation: claim?.validation ? { result: claim.validation.result } : null }
      : null,
    today,
  );
}

export function complianceCounts(
  prescriptions: EvaluationPrescription[],
  today: string,
  claimStates = new Map<string, string | null>(),
): ComplianceCounts {
  const counts = Object.fromEntries(COMPLIANCE_STATES.map((state) => [state, 0])) as ComplianceCounts;
  prescriptions.forEach((prescription) => {
    const state = prescriptionComplianceState(
      prescription,
      today,
      claimStates.has(prescription.id) ? claimStates.get(prescription.id) : undefined,
    );
    counts[state] += 1;
  });
  return counts;
}

export function weeklyDistanceSummary(prescriptions: EvaluationPrescription[]) {
  let prescribedDistanceM = 0;
  let measurablePrescriptionCount = 0;
  const countedActivities = new Set<string>();
  let claimedRunningDistanceM = 0;

  prescriptions.forEach((prescription) => {
    const targetDistance = prescriptionTargetDistanceM(prescription);
    if (targetDistance !== null) {
      prescribedDistanceM += targetDistance;
      measurablePrescriptionCount += 1;
    }

    const submittedClaim = prescription.claims.find((claim) => claim.status === "SUBMITTED");
    submittedClaim?.evidence.forEach(({ activity }) => {
      if (activity.sport_type !== "RUNNING" || countedActivities.has(activity.id)) return;
      countedActivities.add(activity.id);
      claimedRunningDistanceM += activity.distance_m ?? 0;
    });
  });

  return {
    prescribedDistanceM: measurablePrescriptionCount > 0 ? prescribedDistanceM : null,
    claimedRunningDistanceM,
    measurablePrescriptionCount,
  };
}

export function flattenPrescriptions(program: EvaluationProgram) {
  return program.weeks.flatMap((week) => week.prescriptions);
}
