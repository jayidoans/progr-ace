export type InstallAvailability = "chromium" | "ios" | "none";

export function getInstallAvailability({
  hasDeferredPrompt,
  isIos,
  isStandalone,
}: {
  hasDeferredPrompt: boolean;
  isIos: boolean;
  isStandalone: boolean;
}): InstallAvailability {
  if (isStandalone) return "none";
  if (hasDeferredPrompt) return "chromium";
  return isIos ? "ios" : "none";
}

export function shouldBlockOfflineFormSubmission(isOnline: boolean, method: string) {
  return !isOnline && method.toLowerCase() !== "get";
}
