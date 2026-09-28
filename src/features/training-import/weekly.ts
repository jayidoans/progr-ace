import type { NormalizedTrainingPlan, NormalizedWeek } from "@/src/features/training-import/types";

export type WeeklyImportTarget = {
  weekNumber: number;
  startDate: string;
  endDate: string;
};

export type WeeklyImportSelection =
  | { ok: true; week: NormalizedWeek }
  | { ok: false; message: string };

export function selectWeeklyImport(
  plan: NormalizedTrainingPlan,
  target: WeeklyImportTarget,
): WeeklyImportSelection {
  if (plan.weeks.length !== 1) {
    return { ok: false, message: "Weekly import requires a workbook containing exactly one week." };
  }

  const week = plan.weeks[0];
  if (
    week.weekNumber !== target.weekNumber
    || week.startDate !== target.startDate
    || week.endDate !== target.endDate
  ) {
    return {
      ok: false,
      message: `The workbook must use Week ${target.weekNumber} and dates ${target.startDate} through ${target.endDate}.`,
    };
  }

  if (week.prescriptions.length === 0) {
    return { ok: false, message: "The workbook does not contain any training sessions for this week." };
  }

  return { ok: true, week };
}
