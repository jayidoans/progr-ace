"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/src/lib/supabase/client";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const WARNING_TIMEOUT_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 15 * 1000;
const LAST_ACTIVITY_KEY = "prograce.browser.last-activity";

function isStandalonePwa() {
  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
}

function readLastActivity() {
  try {
    const value = Number(sessionStorage.getItem(LAST_ACTIVITY_KEY));
    return Number.isFinite(value) && value > 0 ? value : Date.now();
  } catch {
    return Date.now();
  }
}

function writeLastActivity(value: number) {
  try {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(value));
  } catch {
    // Session expiry still works for the current page when storage is blocked.
  }
}

function clearLastActivity() {
  try {
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // There is nothing else to clear when storage is unavailable.
  }
}

export function BrowserInactivityGuard() {
  const [warning, setWarning] = useState(false);
  const continueSession = useCallback(() => {
    writeLastActivity(Date.now());
    setWarning(false);
  }, []);

  useEffect(() => {
    if (isStandalonePwa()) return;

    let lastActivity = readLastActivity();
    let signingOut = false;

    const recordActivity = () => {
      if (signingOut) return;
      lastActivity = Date.now();
      continueSession();
    };

    const signOutForInactivity = async () => {
      if (signingOut) return;
      signingOut = true;
      clearLastActivity();
      try {
        const { error } = await createClient().auth.signOut({ scope: "local" });
        if (error) console.warn("Browser session sign-out failed.");
      } finally {
        window.location.replace("/login?message=Your session expired after 1 hour of inactivity.");
      }
    };

    const checkIdleState = () => {
      const idleFor = Date.now() - lastActivity;
      if (idleFor >= IDLE_TIMEOUT_MS) {
        void signOutForInactivity();
      } else if (idleFor >= IDLE_TIMEOUT_MS - WARNING_TIMEOUT_MS) {
        setWarning(true);
      }
    };

    writeLastActivity(lastActivity);
    const activityEvents: Array<keyof DocumentEventMap> = ["pointerdown", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((event) => document.addEventListener(event, recordActivity, { passive: true }));
    document.addEventListener("visibilitychange", checkIdleState);
    const interval = window.setInterval(checkIdleState, CHECK_INTERVAL_MS);
    checkIdleState();

    return () => {
      window.clearInterval(interval);
      activityEvents.forEach((event) => document.removeEventListener(event, recordActivity));
      document.removeEventListener("visibilitychange", checkIdleState);
    };
  }, [continueSession]);

  if (!warning) return null;

  return (
    <aside aria-live="assertive" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl border border-amber-200 bg-white p-4 shadow-xl ring-1 ring-black/5">
      <p className="font-semibold text-gray-950">Your session will expire soon</p>
      <p className="mt-1 text-sm text-gray-600">You will be signed out after one hour without activity.</p>
      <button className="mt-3 min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700" onClick={continueSession} type="button">
        Continue session
      </button>
    </aside>
  );
}
