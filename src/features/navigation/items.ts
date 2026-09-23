export type DashboardNavigationAccess = {
  activeMode: "ATHLETE" | "COACH" | "ADMIN" | null;
  roles: readonly string[];
};

export type DashboardNavigationGroup = {
  label: "Training" | "Coaching" | "Profile" | "Admin";
  items: { href: string; label: string }[];
};

export function getDashboardNavigationGroups({
  activeMode,
  roles,
}: DashboardNavigationAccess): DashboardNavigationGroup[] {
  const groups: DashboardNavigationGroup[] = [];

  if (activeMode === "ATHLETE") {
    groups.push({
      label: "Training",
      items: [
        { href: "/dashboard/race-goals", label: "Race Goals" },
        { href: "/dashboard/training", label: "Personal Training Schedule" },
        { href: "/dashboard/activities", label: "Activities" },
      ],
    });
  }

  if (activeMode === "COACH" || activeMode === "ADMIN") {
    groups.push({
      label: "Coaching",
      items: [
        { href: "/dashboard/coaching/athletes", label: "Athletes" },
        { href: "/dashboard/training", label: "Training Schedule" },
        { href: "/dashboard/validation", label: "Validation" },
      ],
    });
  }

  if (roles.includes("ADMIN")) {
    groups.push({
      label: "Admin",
      items: [{ href: "/dashboard/admin/users", label: "Manage Users" }],
    });
  }

  groups.push({
    label: "Profile",
    items: [
      { href: "/dashboard/profile", label: "Edit Profile" },
      ...(activeMode === "ATHLETE"
        ? [{ href: "/dashboard/integrations/strava", label: "Connect to Strava" }]
        : []),
    ],
  });

  return groups;
}

export function getDashboardNavigationItems(access: DashboardNavigationAccess) {
  return [
    { href: "/dashboard", label: "Dashboard" },
    ...getDashboardNavigationGroups(access).flatMap((group) => group.items),
  ];
}
