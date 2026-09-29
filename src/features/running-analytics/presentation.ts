import type { ProgramRunningAnalytics, RunningSessionTrend } from "@/src/features/running-analytics/domain";

export const RUNNING_MENU_FILTERS = ["ALL", "EASY", "MEDIUM", "LONG", "SPEED"] as const;
export type RunningMenuFilter = (typeof RUNNING_MENU_FILTERS)[number];

export function formatDistanceM(value: number | null) {
  return value === null ? "—" : `${(value / 1000).toFixed(1)} km`;
}

export function formatDurationSeconds(value: number | null) {
  if (value === null) return "—";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = Math.round(value % 60);
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatPaceSecondsPerKm(value: number | null) {
  if (value === null || value <= 0 || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")} /km`;
}

export function filterRunningSessions(
  sessions: RunningSessionTrend[],
  filter: RunningMenuFilter,
) {
  return filter === "ALL" ? sessions : sessions.filter((session) => session.trainingMenu === filter);
}

export function summarizeRunningAnalytics(data: ProgramRunningAnalytics) {
  const planned = data.weeks.map((week) => week.prescribedRunningDistanceM).filter((value): value is number => value !== null);
  const completed = data.weeks.map((week) => week.actualClaimedRunningDistanceM).filter((value): value is number => value !== null);
  const publishedSessions = data.weeks.reduce((sum, week) =>
    sum + Object.values(week.outcomes).reduce((weekSum, value) => weekSum + value, 0), 0);
  const missedSessions = data.weeks.reduce((sum, week) => sum + week.outcomes.MISSED, 0);
  return {
    plannedDistanceM: planned.length ? planned.reduce((sum, value) => sum + value, 0) : null,
    completedDistanceM: completed.length ? completed.reduce((sum, value) => sum + value, 0) : null,
    publishedSessions,
    missedSessions,
  };
}

export function summarizeCoachProgramProgress(data: ProgramRunningAnalytics) {
  const weeklyFulfillment = data.weeks
    .filter((week) => week.prescribedRunningDistanceM !== null && week.prescribedRunningDistanceM > 0)
    .map((week) => ({
      weekId: week.weekId,
      weekNumber: week.weekNumber,
      phase: week.phase,
      isCurrentWeek: week.isCurrentWeek,
      prescribedDistanceM: week.prescribedRunningDistanceM as number,
      actualDistanceM: week.actualClaimedRunningDistanceM,
      actualPercent: week.actualClaimedRunningDistanceM === null
        ? null
        : (week.actualClaimedRunningDistanceM / (week.prescribedRunningDistanceM as number)) * 100,
    }));
  const completedWeekPercentages = weeklyFulfillment
    .filter((week) => !week.isCurrentWeek && week.actualPercent !== null)
    .map((week) => week.actualPercent as number);
  const activities = new Map(
    data.sessions.flatMap((session) => session.runningActivities).map((activity) => [activity.id, activity]),
  );
  const knownDistances = [...activities.values()]
    .map((activity) => activity.distance_m)
    .filter((value): value is number => value !== null);
  const knownDurations = [...activities.values()]
    .map((activity) => activity.duration_sec)
    .filter((value): value is number => value !== null);

  return {
    weeklyFulfillment,
    averageWeeklyFulfillmentPercent: completedWeekPercentages.length === 0
      ? null
      : completedWeekPercentages.reduce((sum, value) => sum + value, 0) / completedWeekPercentages.length,
    totalClaimedRunningDistanceM: knownDistances.length === 0
      ? null
      : knownDistances.reduce((sum, value) => sum + value, 0),
    totalClaimedRunningDurationSec: knownDurations.length === 0
      ? null
      : knownDurations.reduce((sum, value) => sum + value, 0),
  };
}

export function filterLabel(filter: RunningMenuFilter) {
  return filter === "ALL" ? "All Running" : `${filter[0]}${filter.slice(1).toLowerCase()}`;
}
