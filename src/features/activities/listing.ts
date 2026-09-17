export const ACTIVITY_LIST_LIMITS = [10, 20, 30] as const;
export type ActivityListLimit = (typeof ACTIVITY_LIST_LIMITS)[number];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function parseActivityListLimit(value: string | string[] | undefined): ActivityListLimit {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 10) return 10;
  if (parsed <= 20) return 20;
  return 30;
}

export function activityListCutoff(now = new Date()) {
  return new Date(now.getTime() - THIRTY_DAYS_MS).toISOString();
}

export function activityListQueryLimit(visibleLimit: ActivityListLimit) {
  return visibleLimit === 30 ? 30 : visibleLimit + 1;
}

export function paginateActivityList<T>(records: T[], visibleLimit: ActivityListLimit) {
  return {
    records: records.slice(0, visibleLimit),
    hasMore: records.length > visibleLimit,
  };
}

export function nextActivityListLimit(current: ActivityListLimit): ActivityListLimit | null {
  if (current === 10) return 20;
  if (current === 20) return 30;
  return null;
}
