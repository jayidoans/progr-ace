"use client";

import { useState } from "react";

import { THEME_STORAGE_KEY, type AppTheme } from "@/src/features/theme/preferences";

export function ThemeToggle({ initialTheme }: { initialTheme: AppTheme }) {
  const [theme, setTheme] = useState(initialTheme);
  const isDark = theme === "dark";

  const toggleTheme = () => {
    const nextTheme: AppTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.dataset.theme = nextTheme;
    document.cookie = `${THEME_STORAGE_KEY}=${nextTheme}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <button
      aria-checked={isDark}
      className="flex min-h-11 w-full items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left hover:border-indigo-300"
      onClick={toggleTheme}
      role="switch"
      type="button"
    >
      <span>
        <span className="block font-semibold text-gray-950">Dark mode</span>
        <span className="mt-1 block text-sm text-gray-600">
          Use a darker ProgrACE color palette across the application.
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          isDark ? "bg-indigo-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            isDark ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}
