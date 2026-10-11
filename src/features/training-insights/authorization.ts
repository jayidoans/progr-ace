import { canReadProgramRunningAnalytics } from "@/src/features/running-analytics/authorization";

export type TrainingInsightsProgramAuthorization = {
  userId: string;
  roles: string[];
  programStatus: string;
  programCreatedBy: string;
  athleteId: string;
};

/**
 * Insights use the same resource authorization contract as Running Analytics.
 * Active Mode is deliberately absent: it is presentation state, not authority.
 */
export function canReadTrainingInsightsProgram(input: TrainingInsightsProgramAuthorization) {
  return canReadProgramRunningAnalytics(input);
}

export function canReadCoachTrainingInsights(roles: string[]) {
  return roles.includes("ADMIN") || roles.includes("COACH");
}
