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

export function filterLabel(filter: RunningMenuFilter) {
  return filter === "ALL" ? "All Running" : `${filter[0]}${filter.slice(1).toLowerCase()}`;
}
