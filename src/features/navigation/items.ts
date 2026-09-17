export type DashboardNavigationAccess = {
  canReview: boolean;
  isAthlete: boolean;
};

export function getDashboardNavigationItems({ canReview, isAthlete }: DashboardNavigationAccess) {
  return [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/race-goals", label: "Race goals" },
    { href: "/dashboard/training", label: "Training" },
    { href: "/dashboard/activities", label: "Activities" },
    ...(isAthlete
      ? [{ href: "/dashboard/integrations/strava", label: "Integrations" }]
      : []),
    ...(canReview ? [{ href: "/dashboard/validation", label: "Validation" }] : []),
    { href: "/dashboard/profile", label: "Profile" },
  ];
}
