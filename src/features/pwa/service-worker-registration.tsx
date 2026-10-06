"use client";

import { useEffect } from "react";

export const SERVICE_WORKER_URL = "/service-worker.js";

export function shouldRegisterServiceWorker(isSupported: boolean, environment: string | undefined) {
  return isSupported && environment !== "development";
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!shouldRegisterServiceWorker("serviceWorker" in navigator, process.env.NODE_ENV)) {
      return;
    }

    const register = () => {
      void navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" }).catch(() => {
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
