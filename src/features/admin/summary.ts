export type AdminDirectoryUser = {
  userId: string;
  roles: string[];
  stravaConnected?: boolean;
};

export function summarizeAdminUsers(users: AdminDirectoryUser[]) {
  const athletes = users.filter((user) => user.roles.includes("ATHLETE")).length;
  return {
    accounts: new Set(users.map((user) => user.userId)).size,
    athletes,
    coaches: users.filter((user) => user.roles.includes("COACH")).length,
    stravaConnectedAthletes: users.filter(
      (user) => user.roles.includes("ATHLETE") && user.stravaConnected,
    ).length,
  };
}

export function adminRoleBadgeClass(role: string, stravaConnected?: boolean) {
  if (role === "ATHLETE" && stravaConnected) return "bg-orange-100 text-orange-800";
  return "bg-blue-50 text-blue-700";
}
