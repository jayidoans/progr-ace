"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { getInstallAvailability, shouldBlockOfflineFormSubmission, type InstallAvailability } from "./presentation";
import { PwaServiceWorkerRegistration, SERVICE_WORKER_UPDATE_MESSAGE } from "./service-worker-registration";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaExperienceValue = {
  installAvailability: InstallAvailability;
  install: () => Promise<void>;
};

const PwaExperienceContext = createContext<PwaExperienceValue | null>(null);

function isIosPlatform() {
  const { maxTouchPoints, platform, userAgent } = navigator;
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

function isStandaloneDisplay() {
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function ConnectionStatus({ isOnline, restored }: { isOnline: boolean; restored: boolean }) {
  if (isOnline && !restored) return null;

  const offline = !isOnline;
  return (
    <div
      aria-live="polite"
      className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
        offline
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-emerald-300 bg-emerald-50 text-emerald-900"
      }`}
      role="status"
    >
      <p className="font-semibold">{offline ? "You’re offline" : "Back online"}</p>
      <p className="mt-1 text-xs leading-5">
        {offline
          ? "Some ProgrACE features are unavailable until your connection returns."
          : "You can continue using ProgrACE."}
      </p>
    </div>
  );
}

function UpdateNotice({
  registration,
  onDismiss,
}: {
  registration: ServiceWorkerRegistration | null;
  onDismiss: () => void;
}) {
  const reloadStarted = useRef(false);
  const [updating, setUpdating] = useState(false);

  const update = () => {
    if (!registration?.waiting || updating) return;
    setUpdating(true);

    const reloadWhenControlled = () => {
      if (reloadStarted.current) return;
      reloadStarted.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", reloadWhenControlled, { once: true });
    registration.waiting.postMessage(SERVICE_WORKER_UPDATE_MESSAGE);
  };

  if (!registration) return null;

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm shadow-lg" role="status">
      <p className="font-medium text-gray-900">An update to ProgrACE is available.</p>
      <div className="flex items-center gap-2">
        <button className="min-h-9 rounded-md px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100" onClick={onDismiss} type="button">
          Later
        </button>
        <button className="min-h-9 rounded-md bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-gray-400" disabled={updating} onClick={update} type="button">
          {updating ? "Updating…" : "Update"}
        </button>
      </div>
    </div>
  );
}

export function PwaExperienceProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [restored, setRestored] = useState(false);
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());
    setIsIos(isIosPlatform());
    setIsOnline(navigator.onLine);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    const onOffline = () => {
      setRestored(false);
      setIsOnline(false);
    };
    const onOnline = () => {
      setIsOnline(true);
      setRestored(true);
    };
    const blockOfflineMutation = (event: SubmitEvent) => {
      if (!(event.target instanceof HTMLFormElement)) return;
      if (!shouldBlockOfflineFormSubmission(navigator.onLine, event.target.method)) return;
      event.preventDefault();
      setRestored(false);
      setIsOnline(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    document.addEventListener("submit", blockOfflineMutation, true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("submit", blockOfflineMutation, true);
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    const timeout = window.setTimeout(() => setRestored(false), 5_000);
    return () => window.clearTimeout(timeout);
  }, [restored]);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      // Native install prompting is optional and must not disrupt browser use.
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const installAvailability = getInstallAvailability({
    hasDeferredPrompt: deferredPrompt !== null,
    isIos,
    isStandalone,
  });
  const context = useMemo(() => ({ install, installAvailability }), [install, installAvailability]);

  return (
    <PwaExperienceContext.Provider value={context}>
      {children}
      <PwaServiceWorkerRegistration onUpdateAvailable={setUpdateRegistration} />
      <ConnectionStatus isOnline={isOnline} restored={restored} />
      {!isOnline || restored ? null : <UpdateNotice onDismiss={() => setUpdateRegistration(null)} registration={updateRegistration} />}
    </PwaExperienceContext.Provider>
  );
}

export function usePwaExperience() {
  return useContext(PwaExperienceContext);
}
