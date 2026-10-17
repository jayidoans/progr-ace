"use client";

import { useEffect, useRef } from "react";

export const SERVICE_WORKER_URL = "/service-worker.js";
export const SERVICE_WORKER_UPDATE_MESSAGE = { type: "SKIP_WAITING" } as const;
export const SERVICE_WORKER_UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const LAST_UPDATE_CHECK_KEY = "prograce.pwa.last-update-check";

export function shouldRegisterServiceWorker(isSupported: boolean, environment: string | undefined) {
  return isSupported && environment !== "development";
}

function shouldCheckForUpdate(now = Date.now()) {
  try {
    const lastCheck = Number(localStorage.getItem(LAST_UPDATE_CHECK_KEY));
    return !Number.isFinite(lastCheck) || now - lastCheck >= SERVICE_WORKER_UPDATE_INTERVAL_MS;
  } catch {
    return true;
  }
}

function recordUpdateCheck(now = Date.now()) {
  try {
    localStorage.setItem(LAST_UPDATE_CHECK_KEY, String(now));
  } catch {
    // Update checks remain best-effort when browser storage is unavailable.
  }
}

export function PwaServiceWorkerRegistration({
  onUpdateAvailable,
}: {
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
}) {
  const onUpdateAvailableRef = useRef(onUpdateAvailable);

  useEffect(() => {
    onUpdateAvailableRef.current = onUpdateAvailable;
  }, [onUpdateAvailable]);

  useEffect(() => {
    if (!shouldRegisterServiceWorker("serviceWorker" in navigator, process.env.NODE_ENV)) {
      return;
    }

    let activeRegistration: ServiceWorkerRegistration | null = null;
    let reloadStarted = false;
    let autoActivateNextInstall = false;

    const activateWaitingWorker = (registration: ServiceWorkerRegistration) => {
      if (!registration.waiting || reloadStarted) return;
      const reloadWhenControlled = () => {
        if (reloadStarted) return;
        reloadStarted = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener("controllerchange", reloadWhenControlled, { once: true });
      registration.waiting.postMessage(SERVICE_WORKER_UPDATE_MESSAGE);
    };

    const notifyWhenWaiting = (registration: ServiceWorkerRegistration, autoActivate = false) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        if (autoActivate) {
          activateWaitingWorker(registration);
          return;
        }
        onUpdateAvailableRef.current?.(registration);
      }
    };

    const checkForUpdate = async (registration: ServiceWorkerRegistration) => {
      if (!shouldCheckForUpdate()) return;
      recordUpdateCheck();
      autoActivateNextInstall = true;
      try {
        await registration.update();
      } catch {
        autoActivateNextInstall = false;
        return;
      }
      if (registration.waiting) {
        notifyWhenWaiting(registration, true);
        autoActivateNextInstall = false;
      } else if (!registration.installing) {
        autoActivateNextInstall = false;
      }
    };

    const register = () => {
      void navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" }).then((registration) => {
        activeRegistration = registration;
        notifyWhenWaiting(registration);

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed") {
              notifyWhenWaiting(registration, autoActivateNextInstall);
              autoActivateNextInstall = false;
            }
          });
        });
        void checkForUpdate(registration);
      }).catch(() => {
        // PWA enhancement must never prevent the online application from rendering.
      });
    };

    const checkWhenVisible = () => {
      if (document.visibilityState === "visible" && activeRegistration) {
        void checkForUpdate(activeRegistration);
      }
    };

    document.addEventListener("visibilitychange", checkWhenVisible);
    window.addEventListener("pageshow", checkWhenVisible);

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      document.removeEventListener("visibilitychange", checkWhenVisible);
      window.removeEventListener("pageshow", checkWhenVisible);
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
