"use client";

import { useEffect, useState } from "react";

type SyncState = "idle" | "syncing" | "complete";

export function DemoStravaSyncButton() {
  const [state, setState] = useState<SyncState>("idle");

  useEffect(() => {
    if (state !== "syncing") return;
    const timer = window.setTimeout(() => setState("complete"), 700);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <div className="w-full space-y-2 sm:w-52">
      <button
        className="w-full rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-wait disabled:bg-orange-300"
        disabled={state === "syncing"}
        onClick={() => setState("syncing")}
        type="button"
      >
        {state === "syncing" ? "Syncing from Strava…" : "Sync from Strava (Demo)"}
      </button>
      <div aria-live="polite" className="rounded-md bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-900 ring-1 ring-orange-200">
        {state === "complete"
          ? "Demo sync completed. Synthetic Strava activities are already shown below; no external Strava request was made."
          : "Simulates a Strava sync attempt using synthetic data. No connection or account change is performed."}
      </div>
    </div>
  );
}
