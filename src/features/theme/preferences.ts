export const THEME_STORAGE_KEY = "prograce_theme";

export type AppTheme = "light" | "dark";

export function resolveTheme(value: string | undefined): AppTheme {
  return value === "dark" ? "dark" : "light";
}
