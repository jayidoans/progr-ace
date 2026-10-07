"use client";

import { useEffect, useState } from "react";

import {
  getPushPublicKey,
  isCurrentPushSubscriptionActive,
  registerCurrentPushSubscription,
  revokeCurrentPushSubscription,
} from "./actions";
import { decodeVapidPublicKey, isIosDevice, isStandalonePwa } from "./presentation";

type DeviceState = "loading" | "unsupported" | "install-ios" | "missing-worker" | "denied" | "disabled" | "enabled";

async function currentRegistration() {
  return navigator.serviceWorker.getRegistration("/");
}

export function PushNotificationControl() {
  const [state, setState] = useState<DeviceState>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const inspect = async () => {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (mounted) setState("unsupported");
        return;
      }
      if (isIosDevice() && !isStandalonePwa()) {
        if (mounted) setState("install-ios");
        return;
      }
      try {
        const registration = await currentRegistration();
        if (!registration) { if (mounted) setState("missing-worker"); return; }
        const subscription = await registration.pushManager.getSubscription();
        const active = subscription
          ? await isCurrentPushSubscriptionActive(subscription.endpoint) : false;
        if (mounted) setState(active ? "enabled" : Notification.permission === "denied" ? "denied" : "disabled");
      } catch {
        if (mounted) setState("missing-worker");
      }
    };
    void inspect();
    return () => { mounted = false; };
  }, []);

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      if (Notification.permission === "denied") { setState("denied"); return; }
      const key = await getPushPublicKey();
      if (!key) throw new Error("Push notifications are not configured yet.");
      const permission = Notification.permission === "granted"
        ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "disabled");
        setMessage("Notification permission was not granted.");
        return;
      }
      const registration = await currentRegistration();
      if (!registration) { setState("missing-worker"); return; }
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !(await isCurrentPushSubscriptionActive(subscription.endpoint))) {
        // A stale subscription can belong to a previous account on this device.
        // Never silently transfer its endpoint to the current account.
        if (!(await subscription.unsubscribe())) throw new Error("Remove the previous browser subscription before enabling push.");
        subscription = null;
      }
      subscription ??= await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidPublicKey(key),
      });
      const json = subscription.toJSON();
      if (!json.keys?.p256dh || !json.keys.auth) throw new Error("Browser subscription keys are unavailable.");
      await registerCurrentPushSubscription({
        endpoint: subscription.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth,
      });
      setState("enabled");
      setMessage("Push notifications are enabled on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Push notifications could not be enabled.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const subscription = await (await currentRegistration())?.pushManager.getSubscription();
      if (subscription) {
        await revokeCurrentPushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("disabled");
      setMessage("Push notifications are disabled on this device.");
    } catch {
      setMessage("Could not finish disabling push. Your notification record remains available in ProgrACE.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-xl font-bold text-gray-950">Push notifications</h2>
      <p className="mt-2 text-sm text-gray-600">Optional alerts on this device. Your Notification Center remains available without them.</p>
      {state === "loading" ? <p className="mt-4 text-sm text-gray-600">Checking this device…</p> : null}
      {state === "unsupported" ? <p className="mt-4 text-sm text-gray-600">Push notifications are not available in this browser.</p> : null}
      {state === "install-ios" ? <p className="mt-4 text-sm text-gray-600">On iPhone or iPad, add ProgrACE to your Home Screen, then open the installed app to enable push.</p> : null}
      {state === "missing-worker" ? <p className="mt-4 text-sm text-gray-600">The ProgrACE app service is not ready. Reload while online and try again.</p> : null}
      {state === "denied" ? <p className="mt-4 text-sm text-gray-600">Notifications are blocked in browser settings. Change that permission there if you want to enable push.</p> : null}
      {state === "disabled" ? <button className="mt-5 min-h-11 rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void enable()} type="button">Enable Push Notifications</button> : null}
      {state === "enabled" ? <button className="mt-5 min-h-11 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 disabled:opacity-50" disabled={busy} onClick={() => void disable()} type="button">Disable Push Notifications</button> : null}
      {message ? <p className="mt-3 text-sm text-gray-700" role="status">{message}</p> : null}
    </section>
  );
}
