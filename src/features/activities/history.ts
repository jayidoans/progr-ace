import type { ActivitySportType } from "@/src/features/activities/format";

export const ACTIVITY_CLAIM_FILTERS = ["ALL", "CLAIMED", "NOT_CLAIMED"] as const;
export type ActivityClaimFilter = (typeof ACTIVITY_CLAIM_FILTERS)[number];

export type ActivityHistoryRecord = {
  claimUsage: unknown | null;
  id: string;
  sport_type: string;
  started_at: string;
};

export type ActivityWeekGroup<T extends ActivityHistoryRecord> = {
  activities: T[];
  endDate: string;
  id: string;
  startDate: string;
};

function isoDate(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function daysInUtcMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function activityHistoryCutoff(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const targetMonth = month - 2;
  const target = new Date(Date.UTC(year, targetMonth, 1));
  target.setUTCDate(Math.min(day, daysInUtcMonth(target.getUTCFullYear(), target.getUTCMonth())));
  target.setUTCHours(now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
  return target.toISOString();
}

export function isInActivityHistoryWindow(startedAt: string, now = new Date()) {
  return startedAt >= activityHistoryCutoff(now);
}

export function activityCalendarWeek(value: string) {
  const date = new Date(`${isoDate(value)}T00:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  const start = new Date(date.valueOf() - mondayOffset * 24 * 60 * 60 * 1000);
  const end = new Date(start.valueOf() + 6 * 24 * 60 * 60 * 1000);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export function filterActivityHistory<T extends ActivityHistoryRecord>(
  activities: T[],
  claimFilter: ActivityClaimFilter,
  sportType: ActivitySportType | "ALL",
) {
  return activities.filter((activity) => {
    const matchesClaim =
      claimFilter === "ALL" ||
      (claimFilter === "CLAIMED" ? activity.claimUsage !== null : activity.claimUsage === null);
    return matchesClaim && (sportType === "ALL" || activity.sport_type === sportType);
  });
}

export function groupActivitiesByCalendarWeek<T extends ActivityHistoryRecord>(activities: T[]) {
  const groups = new Map<string, ActivityWeekGroup<T>>();
  activities.forEach((activity) => {
    const week = activityCalendarWeek(activity.started_at);
    const existing = groups.get(week.startDate);
    if (existing) {
      existing.activities.push(activity);
      return;
    }
    groups.set(week.startDate, { activities: [activity], endDate: week.endDate, id: week.startDate, startDate: week.startDate });
  });
  return [...groups.values()].sort((left, right) => left.startDate.localeCompare(right.startDate));
}

export function resolveActivityWeekAnchor<T extends ActivityHistoryRecord>(
  groups: ActivityWeekGroup<T>[],
  today: string,
) {
  const currentWeek = activityCalendarWeek(today);
  const currentIndex = groups.findIndex((group) => group.startDate === currentWeek.startDate);
  if (currentIndex >= 0) return { context: "CURRENT" as const, index: currentIndex, currentWeek };

  let previousIndex = -1;
  groups.forEach((group, index) => {
    if (group.endDate < currentWeek.startDate) previousIndex = index;
  });
  if (previousIndex >= 0) return { context: "PREVIOUS" as const, index: previousIndex, currentWeek };

  return { context: "NEXT" as const, index: groups.length > 0 ? 0 : -1, currentWeek };
}

export function revealPreviousActivityWeekIndex(firstVisible: number) {
  return Math.max(0, firstVisible - 2);
}

export function revealNextActivityWeekIndex(lastVisible: number, groupCount: number) {
  return Math.min(Math.max(0, groupCount - 1), lastVisible + 2);
}
