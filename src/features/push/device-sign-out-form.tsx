"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";

import { signOut, type SignOutState } from "@/src/features/auth/actions";
import { isCurrentPushSubscriptionActive } from "./actions";
import { inspectDevicePushForSignOut } from "./device-logout";

const initialState: SignOutState = { error: null };

export function DeviceSignOutForm({
  className,
  buttonClassName,
}: {
  className?: string;
  buttonClassName?: string;
}) {
  const [result, formAction, pending] = useActionState(signOut, initialState);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const ready = useRef(false);
  const stateInput = useRef<HTMLInputElement>(null);
  const endpointInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (result.error) ready.current = false;
  }, [result]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (ready.current) return;
    event.preventDefault();
    const form = event.currentTarget;
    setDeviceError(null);
    try {
      const device = await inspectDevicePushForSignOut(
        "serviceWorker" in navigator ? navigator.serviceWorker : null,
        isCurrentPushSubscriptionActive,
      );
      if (stateInput.current) stateInput.current.value = device.state;
      if (endpointInput.current) endpointInput.current.value = device.endpoint;
      ready.current = true;
      form.requestSubmit();
    } catch {
      setDeviceError("Could not verify push on this device. Check your connection and retry sign out.");
    }
  }

  return (
    <form action={formAction} className={className} onSubmit={(event) => void onSubmit(event)}>
      <input defaultValue="UNVERIFIED" name="pushState" ref={stateInput} type="hidden" />
      <input defaultValue="" name="pushEndpoint" ref={endpointInput} type="hidden" />
      <button className={buttonClassName} disabled={pending} type="submit">Sign out</button>
      {deviceError || result.error ? <p className="mt-2 text-sm text-red-700" role="alert">{deviceError ?? result.error}</p> : null}
    </form>
  );
}
