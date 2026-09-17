import type { Tables } from "@/src/types/database";

const DAY_MS = 24 * 60 * 60 * 1000;
const NEARBY_DAY_RANGE = 3;

export type ClaimCandidate = Tables<"activities"> & {
  calendarDayOffset: number;
  proximityGroup: "NEAR" | "OTHER";
  proximityLabel: string;
};

function dateOnlyToEpochDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Expected an ISO calendar date.");
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS);
}

export function activityCalendarDayOffset(scheduledDate: string, startedAt: string) {
  const activityDate = new Date(startedAt).toISOString().slice(0, 10);
  return dateOnlyToEpochDay(activityDate) - dateOnlyToEpochDay(scheduledDate);
}

export function formatActivityDayProximity(offset: number) {
  if (offset === 0) return "Same day";
  const days = Math.abs(offset);
  return `${days} ${days === 1 ? "day" : "days"} ${offset < 0 ? "before" : "after"}`;
}

export function prepareClaimCandidates(
  activities: Tables<"activities">[],
  scheduledDate: string,
): ClaimCandidate[] {
  return activities
    .map((activity) => {
      const calendarDayOffset = activityCalendarDayOffset(scheduledDate, activity.started_at);
      return {
        ...activity,
        calendarDayOffset,
        proximityGroup: Math.abs(calendarDayOffset) <= NEARBY_DAY_RANGE ? "NEAR" as const : "OTHER" as const,
        proximityLabel: formatActivityDayProximity(calendarDayOffset),
      };
    })
    .sort((left, right) => {
      if (left.proximityGroup !== right.proximityGroup) {
        return left.proximityGroup === "NEAR" ? -1 : 1;
      }
      const proximityDifference =
        Math.abs(left.calendarDayOffset) - Math.abs(right.calendarDayOffset);
      if (proximityDifference !== 0) return proximityDifference;
      const startDifference = right.started_at.localeCompare(left.started_at);
      return startDifference !== 0 ? startDifference : right.id.localeCompare(left.id);
    });
}

export function groupClaimCandidates(candidates: ClaimCandidate[]) {
  return {
    near: candidates.filter((candidate) => candidate.proximityGroup === "NEAR"),
    other: candidates.filter((candidate) => candidate.proximityGroup === "OTHER"),
  };
}
