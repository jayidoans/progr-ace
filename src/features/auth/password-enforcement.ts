export const PASSWORD_STATUS_UNAVAILABLE_PATH = "/account/access-unavailable";
export const REQUIRED_PASSWORD_CHANGE_PATH = "/account/change-password";

export function passwordGateRedirectPath({
  mustChangePassword,
  passwordStatusUnavailable,
}: {
  mustChangePassword: boolean;
  passwordStatusUnavailable: boolean;
}) {
  if (passwordStatusUnavailable) return PASSWORD_STATUS_UNAVAILABLE_PATH;
  if (mustChangePassword) return REQUIRED_PASSWORD_CHANGE_PATH;
  return null;
}

export function requiresPasswordGate(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/")
    || pathname.startsWith("/api/strava/")
    || pathname === "/calendar" || pathname === "/program";
}
