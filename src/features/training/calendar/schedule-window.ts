import { resolveTrainingScheduleAnchor, type TrainingScheduleContext } from "./training-schedule-utils";
import { materializeProgramCalendar, type MaterializedScheduleWeek } from "../weekly-planning";

export type TrainingScheduleWindow<TPrescription> = {
  anchorContext: TrainingScheduleContext;
  anchorIndex: number;
  calendar: MaterializedScheduleWeek<TPrescription>[];
  next: MaterializedScheduleWeek<TPrescription> | null;
  previous: MaterializedScheduleWeek<TPrescription> | null;
  selected: MaterializedScheduleWeek<TPrescription>;
  selectedIndex: number;
};

export function selectTrainingScheduleWindow<TPrescription>(
  programStart: string,
  programEnd: string,
  today: string,
  requestedWeekStart: string | null,
  focusNextWeek: boolean,
): TrainingScheduleWindow<TPrescription> {
  const calendar = materializeProgramCalendar<TPrescription>(programStart, programEnd, []);
  const anchor = resolveTrainingScheduleAnchor(calendar, today);
  const requestedIndex = requestedWeekStart
    ? calendar.findIndex((week) => week.start_date === requestedWeekStart)
    : -1;
  const selectedIndex = requestedIndex >= 0
    ? requestedIndex
    : focusNextWeek
      ? Math.min(anchor.index + 1, calendar.length - 1)
      : anchor.index;
  return {
    anchorContext: anchor.context,
    anchorIndex: anchor.index,
    calendar,
    selectedIndex,
    selected: calendar[selectedIndex],
    next: calendar[selectedIndex + 1] ?? null,
    previous: calendar[selectedIndex - 1] ?? null,
  };
}
