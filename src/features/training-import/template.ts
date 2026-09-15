export const PROGRACE_TEMPLATE_VERSION = 1;
export const TRAINING_PLAN_SHEET = "Training Plan";
export const INSTRUCTIONS_SHEET = "Instructions";
export const MAX_XLSX_BYTES = 1_000_000;
export const MAX_XLSX_UNCOMPRESSED_BYTES = 10_000_000;
export const MAX_TEMPLATE_ROWS = 500;

export const TRAINING_MENUS = ["EASY", "SPEED", "STRENGTH", "MEDIUM", "LONG"] as const;

export const WORKOUT_TYPES = [
  "EASY",
  "INTERVAL",
  "TEMPO",
  "FARTLEK",
  "STRIDES",
  "RACE_PACE",
  "REPETITIONS",
  "STRENGTH",
  "MEDIUM",
  "LONG",
  "OTHER",
] as const;

export const TEMPLATE_HEADERS = [
  "Week",
  "Date",
  "Phase",
  "Session",
  "Training Menu",
  "Title",
  "Description",
  "Component Order",
  "Workout Type",
  "Target Distance",
  "Target Duration",
  "Repetitions",
  "Distance Per Rep",
  "Recovery",
  "Target Pace Min",
  "Target Pace Max",
  "Instruction",
] as const;
