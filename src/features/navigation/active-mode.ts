export const ACTIVE_MODE_STORAGE_KEY = "prograce_active_mode";

export type ActiveMode = "ATHLETE" | "COACH" | "ADMIN";

export function hasRole(roles: readonly string[], role: ActiveMode): boolean {
  return roles.includes(role);
}

export function resolveActiveMode(
  roles: readonly string[],
  storedMode?: string | null,
): ActiveMode | null {
  const hasAthlete = roles.includes("ATHLETE");
  const hasCoach = roles.includes("COACH");
  const hasAdmin = roles.includes("ADMIN");

  if (storedMode === "ATHLETE" && hasAthlete) return "ATHLETE";
  if (storedMode === "COACH" && hasCoach) return "COACH";
  if (storedMode === "ADMIN" && hasAdmin && !hasAthlete && !hasCoach) return "ADMIN";
  if (hasAthlete && hasCoach) return "ATHLETE";
  if (hasAdmin && !hasCoach) return "ADMIN";
  if (hasAthlete) return "ATHLETE";
  if (hasCoach) return "COACH";
  if (hasAdmin) return "ADMIN";
  return null;
}

export function switchableModes(roles: readonly string[]): ActiveMode[] {
  return ["ATHLETE", "COACH"].filter((mode) => roles.includes(mode)) as ActiveMode[];
}
