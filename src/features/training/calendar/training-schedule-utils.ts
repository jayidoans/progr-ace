type ScheduleWeek = {
  end_date: string;
  start_date: string;
};

export type TrainingScheduleContext = "CURRENT" | "UPCOMING" | "COMPLETED";

export function resolveTrainingScheduleAnchor(weeks: ScheduleWeek[], today: string) {
  const currentIndex = weeks.findIndex(
    (week) => week.start_date <= today && today <= week.end_date,
  );
  if (currentIndex >= 0) return { context: "CURRENT" as const, index: currentIndex };

  const upcomingIndex = weeks.findIndex((week) => today < week.start_date);
  if (upcomingIndex >= 0) return { context: "UPCOMING" as const, index: upcomingIndex };

  return { context: "COMPLETED" as const, index: Math.max(0, weeks.length - 1) };
}

export function revealPreviousWeekIndex(firstVisible: number) {
  return Math.max(0, firstVisible - 2);
}

export function revealNextWeekIndex(lastVisible: number, weekCount: number) {
  return Math.min(Math.max(0, weekCount - 1), lastVisible + 2);
}

export function visibleWeekIndexes(firstVisible: number, lastVisible: number) {
  return Array.from(
    { length: Math.max(0, lastVisible - firstVisible + 1) },
    (_, index) => firstVisible + index,
  );
}
