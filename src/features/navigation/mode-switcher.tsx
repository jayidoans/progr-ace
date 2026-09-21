"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ACTIVE_MODE_STORAGE_KEY,
  type ActiveMode,
  switchableModes,
} from "@/src/features/navigation/active-mode";

export function ModeSwitcher({
  roles,
  activeMode,
}: {
  roles: string[];
  activeMode: ActiveMode | null;
}) {
  const router = useRouter();
  const modes = switchableModes(roles);
  const [mode, setMode] = useState<ActiveMode | null>(activeMode);

  if (modes.length < 2 || !mode) return null;

  function changeMode(nextMode: ActiveMode) {
    if (!modes.includes(nextMode)) return;
    localStorage.setItem(ACTIVE_MODE_STORAGE_KEY, nextMode);
    document.cookie = `prograce_active_mode=${nextMode}; path=/; max-age=31536000; samesite=lax`;
    setMode(nextMode);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
      <span className="sr-only">Active mode</span>
      <select
        aria-label="Active mode"
        className="min-h-11 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
        onChange={(event) => changeMode(event.target.value as ActiveMode)}
        value={mode}
      >
        {modes.map((item) => (
          <option key={item} value={item}>
            {item === "ATHLETE" ? "Athlete" : "Coach"}
          </option>
        ))}
      </select>
    </label>
  );
}
