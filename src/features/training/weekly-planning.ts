export type WeekPlanningStatus = "UNPLANNED" | "DRAFT" | "PUBLISHED";

export type MaterializedScheduleWeek<TPrescription> = {
  id: string;
  week_number: number;
  phase: string | null;
  planning_status: WeekPlanningStatus;
  start_date: string;
  end_date: string;
  prescriptions: TPrescription[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDate(value: number) {
  return new Date(value).toISOString().slice(0, 10);
}

export function materializeProgramCalendar<TPrescription>(
  programStart: string,
  programEnd: string,
  existingWeeks: MaterializedScheduleWeek<TPrescription>[],
) {
  const existingByStart = new Map(existingWeeks.map((week) => [week.start_date, week]));
  const startValue = Date.parse(`${programStart}T00:00:00Z`);
  const endValue = Date.parse(`${programEnd}T00:00:00Z`);
  let cursor = startValue;
  const result: MaterializedScheduleWeek<TPrescription>[] = [];
  let weekNumber = 1;

  while (cursor <= endValue) {
    const startDate = isoDate(cursor);
    const cursorDate = new Date(cursor);
    const daysUntilSunday = (7 - (cursorDate.getUTCDay() || 7)) % 7;
    const weekEndValue = Math.min(endValue, cursor + daysUntilSunday * DAY_MS);
    result.push(existingByStart.get(startDate) ?? {
      id: `unplanned-${startDate}`,
      week_number: weekNumber,
      phase: null,
      planning_status: "UNPLANNED",
      start_date: startDate,
      end_date: isoDate(weekEndValue),
      prescriptions: [],
    });
    existingByStart.delete(startDate);
    cursor = weekEndValue + DAY_MS;
    weekNumber += 1;
  }

  result.push(...existingByStart.values());
  return result.sort((left, right) =>
    left.start_date.localeCompare(right.start_date) || left.week_number - right.week_number,
  );
}
