import type {
  NormalizedPrescription,
  NormalizedTrainingPlan,
} from "@/src/features/training-import/types";

export const DEMO_REFERENCE_DATE = "2027-01-08";
export const DEMO_RACE_DATE = "2027-03-14";

export type DemoSessionOutcome =
  | "VERIFIED"
  | "OVER_TARGET"
  | "PARTIAL"
  | "REJECTED"
  | "MISSED"
  | "NEEDS_REVIEW"
  | "UPCOMING";

export type ShiftedDemoSession = NormalizedPrescription & {
  weekNumber: number;
  phase: string;
  outcome: DemoSessionOutcome;
};

export type ShiftedDemoWeek = {
  weekNumber: number;
  phase: string;
  startDate: string;
  endDate: string;
  prescriptions: ShiftedDemoSession[];
};

export type DemoSeedPlan = {
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  referenceDate: string;
  raceDate: string;
  shiftDays: number;
  weeks: ShiftedDemoWeek[];
};

const SIMPLE_OUTCOME_SEQUENCE: readonly Exclude<DemoSessionOutcome, "UPCOMING" | "REJECTED" | "NEEDS_REVIEW">[] = [
  "VERIFIED",
  "PARTIAL",
  "OVER_TARGET",
  "MISSED",
  "VERIFIED",
];

const STRUCTURED_OUTCOME_SEQUENCE: readonly Exclude<DemoSessionOutcome, "UPCOMING" | "PARTIAL" | "OVER_TARGET" | "MISSED">[] = [
  "NEEDS_REVIEW",
  "REJECTED",
  "VERIFIED",
];

export function requiresCoachReview(prescription: NormalizedPrescription) {
  return prescription.components.some((component) =>
    component.componentType === "INTERVAL"
    || component.componentType === "TEMPO"
    || component.componentType === "RACE_PACE"
    || component.componentType === "STRIDES"
    || component.repetitions !== null
    || component.distancePerRepM !== null
    || component.recoveryDurationSec !== null
  );
}

function parseIsoDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must use YYYY-MM-DD.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} is invalid.`);
  }
  return date;
}

export function shiftIsoDate(value: string, days: number) {
  const date = parseIsoDate(value, "Date");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dayDifference(from: string, to: string) {
  return Math.round(
    (parseIsoDate(to, "Target date").valueOf() - parseIsoDate(from, "Source date").valueOf())
      / 86_400_000,
  );
}

export function buildDemoSeedPlan(
  source: NormalizedTrainingPlan,
  options: { referenceDate?: string; raceDate?: string } = {},
): DemoSeedPlan {
  const referenceDate = options.referenceDate ?? DEMO_REFERENCE_DATE;
  const raceDate = options.raceDate ?? DEMO_RACE_DATE;
  parseIsoDate(referenceDate, "Reference date");
  parseIsoDate(raceDate, "Race date");

  if (source.weeks.length === 0) throw new Error("The source plan has no training weeks.");
  const finalWeek = source.weeks.at(-1)!;
  const finalPrescriptionDate = finalWeek.prescriptions
    .map((prescription) => prescription.scheduledDate)
    .sort()
    .at(-1);
  if (!finalPrescriptionDate || finalPrescriptionDate !== source.endDate) {
    throw new Error("The source plan must end with its final scheduled session.");
  }

  const shiftDays = dayDifference(source.endDate, raceDate);
  let simpleHistoricalIndex = 0;
  let structuredHistoricalIndex = 0;
  const weeks = source.weeks.map((week) => {
    const prescriptions = week.prescriptions.map((prescription) => {
      const scheduledDate = shiftIsoDate(prescription.scheduledDate, shiftDays);
      let outcome: DemoSessionOutcome = "UPCOMING";
      if (scheduledDate <= referenceDate) {
        if (requiresCoachReview(prescription)) {
          outcome = STRUCTURED_OUTCOME_SEQUENCE[
            structuredHistoricalIndex++ % STRUCTURED_OUTCOME_SEQUENCE.length
          ];
        } else {
          outcome = SIMPLE_OUTCOME_SEQUENCE[
            simpleHistoricalIndex++ % SIMPLE_OUTCOME_SEQUENCE.length
          ];
        }
      }
      return {
        ...prescription,
        scheduledDate,
        weekNumber: week.weekNumber,
        phase: week.phase,
        outcome,
      };
    });
    return {
      weekNumber: week.weekNumber,
      phase: week.phase,
      startDate: shiftIsoDate(week.startDate, shiftDays),
      endDate: shiftIsoDate(week.endDate, shiftDays),
      prescriptions,
    };
  });

  return {
    name: "Marathon Training",
    description: "A synthetic 17-week marathon plan for the public ProgrACE research demonstration.",
    startDate: shiftIsoDate(source.startDate, shiftDays),
    endDate: raceDate,
    referenceDate,
    raceDate,
    shiftDays,
    weeks,
  };
}

export function plannedDistanceM(prescription: NormalizedPrescription) {
  let total = 0;
  let measured = false;
  for (const component of prescription.components) {
    if (component.targetDistanceM !== null) {
      total += component.targetDistanceM;
      measured = true;
    } else if (component.repetitions !== null && component.distancePerRepM !== null) {
      total += component.repetitions * component.distancePerRepM;
      measured = true;
    }
  }
  return measured ? total : null;
}

export function plannedDurationSec(prescription: NormalizedPrescription) {
  const values = prescription.components
    .map((component) => component.targetDurationSec)
    .filter((value): value is number => value !== null);
  return values.length > 0 ? values.reduce((total, value) => total + value, 0) : null;
}

export function demoActivitySource(sequence: number): "MANUAL" | "STRAVA" {
  return sequence % 4 === 0 ? "STRAVA" : "MANUAL";
}

export function demoActualMetrics(session: ShiftedDemoSession) {
  const distanceTarget = plannedDistanceM(session);
  const durationTarget = plannedDurationSec(session);
  const factor = session.outcome === "PARTIAL" ? 0.72
    : session.outcome === "OVER_TARGET" ? 1.18
      : session.outcome === "REJECTED" ? 0.84
        : 1.03;
  const distanceM = distanceTarget === null
    ? durationTarget === null ? null : Math.round((durationTarget * factor / 360) * 1000)
    : Math.round(distanceTarget * factor);
  const durationSec = durationTarget === null
    ? distanceM === null ? null : Math.round((distanceM / 1000) * 375)
    : Math.round(durationTarget * factor);
  return { distanceM, durationSec };
}

export function demoEntityId(kind: "race" | "goal" | "program" | "week" | "prescription" | "component" | "activity" | "claim" | "claimActivity" | "validation" | "check" | "weekReview", sequence = 1) {
  const prefixes = {
    race: "de200000",
    goal: "de300000",
    program: "de400000",
    week: "de410000",
    prescription: "de500000",
    component: "de600000",
    activity: "de700000",
    claim: "de800000",
    claimActivity: "de810000",
    validation: "de900000",
    check: "dea00000",
    weekReview: "deb00000",
  } as const;
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999_999_999_999) {
    throw new Error("Demo entity sequence is out of range.");
  }
  return `${prefixes[kind]}-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}
