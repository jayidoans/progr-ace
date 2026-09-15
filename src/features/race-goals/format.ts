const namedDistances = new Map<number, string>([
  [5000, "5K"],
  [10000, "10K"],
  [21097, "Half Marathon"],
  [21098, "Half Marathon"],
  [42195, "Marathon"],
]);

export function formatDistanceName(distanceM: number) {
  return namedDistances.get(distanceM) ?? "Road race";
}

export function formatDistanceKilometers(distanceM: number) {
  return `${new Intl.NumberFormat("en", {
    maximumFractionDigits: 3,
  }).format(distanceM / 1000)} km`;
}

export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function formatPace(distanceM: number, totalSeconds: number) {
  const secondsPerKilometer = Math.round(totalSeconds / (distanceM / 1000));
  const minutes = Math.floor(secondsPerKilometer / 60);
  const seconds = secondsPerKilometer % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")} /km`;
}

export function formatRaceDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
