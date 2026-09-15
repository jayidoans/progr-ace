import type { PrescriptionComponent } from "@/src/features/training/queries";

export function formatTrainingDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatSeconds(value: number) {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  return hours > 0
    ? [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":")
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatComponent(component: PrescriptionComponent) {
  const parts: string[] = [];
  if (component.repetitions && component.distance_per_rep_m) {
    parts.push(`${component.repetitions} × ${component.distance_per_rep_m} m`);
  } else if (component.target_distance_m) {
    parts.push(`${component.target_distance_m / 1000} km`);
  }
  if (component.target_duration_sec) parts.push(formatSeconds(component.target_duration_sec));
  if (component.recovery_duration_sec) parts.push(`${formatSeconds(component.recovery_duration_sec)} recovery`);
  if (component.target_pace_min_sec_per_km) {
    const maximum = component.target_pace_max_sec_per_km
      ? `–${formatSeconds(component.target_pace_max_sec_per_km)}`
      : "";
    parts.push(`${formatSeconds(component.target_pace_min_sec_per_km)}${maximum} /km`);
  }
  if (component.instruction) parts.push(component.instruction);
  return parts.join(" · ") || component.component_type;
}
