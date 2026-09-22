const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function activityListCutoff(now = new Date()) {
  return new Date(now.getTime() - THIRTY_DAYS_MS).toISOString();
}
