export type AnalyticsRole = "ATHLETE" | "COACH" | "ADMIN";

export type ProgramAnalyticsAuthorization = {
  userId: string;
  roles: string[];
  programStatus: string;
  programCreatedBy: string;
  athleteId: string;
};

export function canReadProgramRunningAnalytics({
  userId,
  roles,
  programStatus,
  programCreatedBy,
  athleteId,
}: ProgramAnalyticsAuthorization) {
  if (!["PUBLISHED", "CANCELLED", "ARCHIVED"].includes(programStatus)) return false;
  if (roles.includes("ADMIN")) return true;
  if (roles.includes("COACH") && programCreatedBy === userId) return true;
  return roles.includes("ATHLETE")
    && ["PUBLISHED", "CANCELLED"].includes(programStatus)
    && athleteId === userId;
}
