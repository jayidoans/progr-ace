export function requiresPasswordGate(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/")
    || pathname.startsWith("/api/strava/")
    || pathname === "/calendar" || pathname === "/program";
}
