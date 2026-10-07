export type DevicePushState = { state: "NONE" | "SUBSCRIBED"; endpoint: string };

// Browser state selects the local endpoint only. The database RPC verifies its
// authenticated owner before changing any subscription.
export async function inspectDevicePushForSignOut(
  serviceWorker: Pick<ServiceWorkerContainer, "getRegistration"> | null,
  isActive: (endpoint: string) => Promise<boolean>,
): Promise<DevicePushState> {
  if (!serviceWorker) return { state: "NONE", endpoint: "" };
  const registration = await serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return { state: "NONE", endpoint: "" };

  let active = false;
  try { active = await isActive(subscription.endpoint); } catch { /* Unknown owner is treated as stale. */ }
  if (!active) {
    if (!(await subscription.unsubscribe())) {
      throw new Error("The previous browser subscription could not be removed. Please retry sign out.");
    }
    // The endpoint is not owned by this session, so its authenticated revoke
    // would correctly fail. Browser removal prevents reuse on this device.
    return { state: "NONE", endpoint: "" };
  }
  return { state: "SUBSCRIBED", endpoint: subscription.endpoint };
}
