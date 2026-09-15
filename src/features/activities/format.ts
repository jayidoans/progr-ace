export const ACTIVITY_SPORT_TYPES = [
  "RUNNING",
  "STRENGTH_TRAINING",
  "WALKING",
  "CYCLING",
  "PADEL",
  "OTHER",
] as const;

export type ActivitySportType = (typeof ACTIVITY_SPORT_TYPES)[number];

export function kilometersToMeters(value: string): number | null {
  const normalized = value.trim();
  if (normalized === "") return null;
  if (!/^\d+(?:\.\d{1,3})?$/.test(normalized)) return Number.NaN;
  return Math.round(Number(normalized) * 1000);
}

export function formatDistance(distanceM: number | null): string {
  if (distanceM === null) return "—";
  return `${(distanceM / 1000).toLocaleString("en-US", {
    maximumFractionDigits: 3,
  })} km`;
}

export function parseDuration(value: string): number | null {
  const normalized = value.trim();
  if (normalized === "") return null;

  const parts = normalized.split(":");
  if (parts.length !== 2 && parts.length !== 3) return Number.NaN;
  if (parts.some((part) => !/^\d+$/.test(part))) return Number.NaN;

  const numbers = parts.map(Number);
  if (parts.length === 2) {
    const [minutes, seconds] = numbers;
    if (seconds > 59) return Number.NaN;
    return minutes * 60 + seconds;
  }

  const [hours, minutes, seconds] = numbers;
  if (minutes > 59 || seconds > 59) return Number.NaN;
  return hours * 3600 + minutes * 60 + seconds;
}

export function formatDuration(durationSec: number | null): string {
  if (durationSec === null) return "—";
  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  const seconds = durationSec % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function derivePaceSecPerKm(
  distanceM: number | null,
  durationSec: number | null,
): number | null {
  if (distanceM === null || distanceM <= 0 || durationSec === null || durationSec <= 0) {
    return null;
  }
  return Math.round((durationSec * 1000) / distanceM);
}

export function formatPace(distanceM: number | null, durationSec: number | null): string {
  const pace = derivePaceSecPerKm(distanceM, durationSec);
  return pace === null ? "—" : `${formatDuration(pace)}/km`;
}

export function formatSportType(sportType: string): string {
  return sportType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatActivityDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function localDateTimeToIso(value: string, timezoneOffsetMinutes: number): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute) + timezoneOffsetMinutes * 60_000;
  const date = new Date(utcMillis);
  if (
    Number.isNaN(date.valueOf()) ||
    new Date(Date.UTC(year, month - 1, day, hour, minute)).toISOString().slice(0, 16) !==
      `${value}:00.000Z`.slice(0, 16)
  ) {
    return null;
  }
  return date.toISOString();
}

