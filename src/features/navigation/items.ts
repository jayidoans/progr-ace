export type DashboardNavigationAccess = {
  canReview: boolean;
  isAthlete: boolean;
};

export type DashboardNavigationGroup = {
  label: "Training" | "Coaching" | "Profile";
  items: { href: string; label: string }[];
};

export function getDashboardNavigationGroups({
  canReview,
  isAthlete,
}: DashboardNavigationAccess): DashboardNavigationGroup[] {
  const groups: DashboardNavigationGroup[] = [
    {
      label: "Training",
      items: [
        { href: "/dashboard/race-goals", label: "Race Goals" },
        ...(isAthlete
          ? [{ href: "/dashboard/training", label: "Personal Training Schedule" }]
          : []),
        { href: "/dashboard/activities", label: "Activities" },
      ],
    },
  ];

  if (canReview) {
    groups.push({
      label: "Coaching",
      items: [
        { href: "/dashboard/training", label: "Training Schedule" },
        { href: "/dashboard/validation", label: "Validation" },
      ],
    });
  }

  groups.push({
    label: "Profile",
    items: [
      { href: "/dashboard/profile", label: "Edit Profile" },
      ...(isAthlete
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
