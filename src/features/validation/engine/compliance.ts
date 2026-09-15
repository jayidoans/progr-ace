import type { ValidationResult } from "@/src/features/validation/types";

export const COMPLIANCE_STATES = [
  "UPCOMING",
  "NOT_CLAIMED",
  "DRAFT",
  "SUBMITTED",
  "VERIFIED",
  "PARTIAL",
  "NEEDS_REVIEW",
  "REJECTED",
  "MISSED",
] as const;

export type ComplianceState = (typeof COMPLIANCE_STATES)[number];

type ClaimState = {
  status: string;
  validation: { result: string } | null;
} | null;

export function utcDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
export function deriveComplianceState(
  scheduledDate: string,
  claim: ClaimState,
  today = utcDateString(),
): ComplianceState {
  if (claim?.status === "DRAFT") return "DRAFT";
  if (claim?.status === "SUBMITTED") {
    if (claim.validation && isValidationResult(claim.validation.result)) {
      return claim.validation.result;
    }
    return "SUBMITTED";
  }
  if (scheduledDate < today) return "MISSED";
  if (scheduledDate > today) return "UPCOMING";
  return "NOT_CLAIMED";
}

function isValidationResult(value: string): value is ValidationResult {
  return ["VERIFIED", "PARTIAL", "NEEDS_REVIEW", "REJECTED"].includes(value);
}
