import { formatDistance, formatDuration } from "@/src/features/activities/format";
import type { ValidationCheck } from "@/src/features/validation/types";

export function formatValidationValue(
  numericValue: number | null,
  textValue: string | null,
  unit: string | null,
): string {
  if (textValue) return textValue.replaceAll("_", " ");
  if (numericValue === null) return "Not available";
  if (unit === "METER") return formatDistance(numericValue);
  if (unit === "SECOND") return formatDuration(numericValue);
  if (unit === "SECOND_PER_KM") return `${formatDuration(numericValue)}/km`;
  return numericValue.toLocaleString("en-US");
}

export function distanceCompletion(
  check: Pick<ValidationCheck, "check_type" | "target_value" | "actual_value">,
): number | null {
  if (
    !["DISTANCE", "TOTAL_DISTANCE"].includes(check.check_type) ||
    check.target_value === null ||
    check.target_value <= 0 ||
    check.actual_value === null
  ) {
    return null;
  }
  return Math.round((check.actual_value / check.target_value) * 1000) / 10;
}

export function validationLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
