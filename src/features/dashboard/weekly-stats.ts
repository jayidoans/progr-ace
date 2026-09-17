const DAY_MS = 24 * 60 * 60 * 1000;

type DistanceComponent = {
  target_distance_m: number | null;
  repetitions: number | null;
  distance_per_rep_m: number | null;
};

type DistanceActivity = {
  distance_m: number | null;
  sport_type: string;
};

export type TrainingWeekWindow = {
  startAt: string;
  endAt: string;
  startDate: string;
  endDate: string;
};

export function currentTrainingWeek(now = new Date()): TrainingWeekWindow {
  const currentDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const mondayOffset = (currentDate.getUTCDay() + 6) % 7;
  const start = new Date(currentDate.valueOf() - mondayOffset * DAY_MS);
  const endExclusive = new Date(start.valueOf() + 7 * DAY_MS);
  const endInclusive = new Date(endExclusive.valueOf() - DAY_MS);

  return {
    startAt: start.toISOString(),
    endAt: endExclusive.toISOString(),
    startDate: start.toISOString().slice(0, 10),
    endDate: endInclusive.toISOString().slice(0, 10),
  };
}

export function componentTargetDistanceM(component: DistanceComponent) {
  if (component.target_distance_m !== null) return component.target_distance_m;
  if (component.repetitions !== null && component.distance_per_rep_m !== null) {
    return component.repetitions * component.distance_per_rep_m;
  }
  return null;
}

export function sumTargetDistanceM(components: DistanceComponent[]) {
  const distances = components
    .map(componentTargetDistanceM)
    .filter((distance): distance is number => distance !== null);
  return distances.length === 0 ? null : distances.reduce((total, distance) => total + distance, 0);
}

export function summarizeStravaActivities(activities: DistanceActivity[]) {
  return {
    totalActivities: activities.length,
    runningDistanceM: activities.reduce(
      (total, activity) =>
        activity.sport_type === "RUNNING" ? total + (activity.distance_m ?? 0) : total,
      0,
    ),
  };
}

export function distanceCompletionPercent(actualDistanceM: number, targetDistanceM: number | null) {
  if (targetDistanceM === null || targetDistanceM <= 0) return null;
  return Math.round((actualDistanceM / targetDistanceM) * 100);
}
