"use client";

import { useEffect, useRef } from "react";

export const SERVICE_WORKER_URL = "/service-worker.js";
export const SERVICE_WORKER_UPDATE_MESSAGE = { type: "SKIP_WAITING" } as const;

export function shouldRegisterServiceWorker(isSupported: boolean, environment: string | undefined) {
  return isSupported && environment !== "development";
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

    const notifyWhenWaiting = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        onUpdateAvailableRef.current?.(registration);
      }
    };

    const register = () => {
      void navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" }).then((registration) => {
        notifyWhenWaiting(registration);

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed") notifyWhenWaiting(registration);
          });
        });
      }).catch(() => {
        // PWA enhancement must never prevent the online application from rendering.
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
