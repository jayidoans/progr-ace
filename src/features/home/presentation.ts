export function getHomepageActions(authenticated: boolean) {
  return authenticated
    ? {
        header: { href: "/dashboard", label: "Dashboard" },
        primary: { href: "/dashboard/training", label: "Open Training" },
        secondary: { href: "/dashboard/activities", label: "View activities" },
      }
    : {
        header: { href: "/register", label: "Get started" },
        primary: { href: "/register", label: "Start training intentionally" },
        secondary: { href: "/login", label: "Sign in" },
      };
}
