import type { Tables } from "@/src/types/database";

export const VALIDATION_RESULTS = ["VERIFIED", "PARTIAL", "NEEDS_REVIEW", "REJECTED"] as const;
export const COACH_DECISIONS = ["VERIFIED", "PARTIAL", "REJECTED"] as const;

export type ValidationResult = (typeof VALIDATION_RESULTS)[number];
export type CoachDecision = (typeof COACH_DECISIONS)[number];
export type ClaimValidation = Tables<"claim_validations">;
export type ValidationCheck = Tables<"validation_checks">;
export type ValidationWithChecks = ClaimValidation & { checks: ValidationCheck[] };
