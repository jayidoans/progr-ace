import type { TRAINING_MENUS, WORKOUT_TYPES } from "@/src/features/training-import/template";

export type TrainingMenu = (typeof TRAINING_MENUS)[number];
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export type NormalizedComponent = {
  sequenceOrder: number;
  componentType: WorkoutType;
  targetDistanceM: number | null;
  targetDurationSec: number | null;
  repetitions: number | null;
  distancePerRepM: number | null;
  recoveryDurationSec: number | null;
  targetPaceMinSecPerKm: number | null;
  targetPaceMaxSecPerKm: number | null;
  instruction: string | null;
};

export type NormalizedPrescription = {
  session: string;
  scheduledDate: string;
  trainingMenu: TrainingMenu;
  title: string;
  description: string | null;
  components: NormalizedComponent[];
};

export type NormalizedWeek = {
  weekNumber: number;
  phase: string;
  startDate: string;
  endDate: string;
  prescriptions: NormalizedPrescription[];
};

export type NormalizedTrainingPlan = {
  templateVersion: 1;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  weeks: NormalizedWeek[];
};

export type ImportIssue = {
  level: "WARNING" | "ERROR";
  message: string;
  row?: number;
};

export type TrainingTemplateParseResult = {
  status: "VALID" | "WARNING" | "ERROR";
  plan: NormalizedTrainingPlan | null;
  warnings: ImportIssue[];
  errors: ImportIssue[];
};
