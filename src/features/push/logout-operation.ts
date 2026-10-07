export type LogoutResult = "DONE" | "UNVERIFIED" | "REVOKE_FAILED" | "SIGNOUT_FAILED";

export async function performDeviceScopedLogout(
  state: FormDataEntryValue | null,
  endpoint: FormDataEntryValue | null,
  revokeEndpoint: (value: string) => Promise<boolean>,
  signOutLocal: () => Promise<boolean>,
): Promise<LogoutResult> {
  if (state === "SUBSCRIBED") {
    if (typeof endpoint !== "string" || endpoint.length < 30 || endpoint.length > 2048) return "UNVERIFIED";
    try {
      if (!(await revokeEndpoint(endpoint))) return "REVOKE_FAILED";
    } catch {
      return "REVOKE_FAILED";
    }
  } else if (state !== "NONE") {
    return "UNVERIFIED";
  }
  try {
    return (await signOutLocal()) ? "DONE" : "SIGNOUT_FAILED";
  } catch {
    return "SIGNOUT_FAILED";
  }
}
