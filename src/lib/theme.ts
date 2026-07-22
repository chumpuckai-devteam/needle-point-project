import { loadFromStorage, saveToStorage } from "./storage";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "needlepoint:themePreference";

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

export function loadThemePreference(): ThemePreference {
  const raw = loadFromStorage<string | null>(THEME_STORAGE_KEY, null);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  // Also accept plain string storage (not JSON)
  try {
    const plain = localStorage.getItem(THEME_STORAGE_KEY);
    if (plain === "light" || plain === "dark" || plain === "system") return plain;
    // JSON-encoded string
    if (plain) {
      const parsed = JSON.parse(plain) as unknown;
      if (parsed === "light" || parsed === "dark" || parsed === "system") return parsed;
    }
  } catch {
    /* ignore */
  }
  return "system";
}

export function saveThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    saveToStorage(THEME_STORAGE_KEY, preference);
  }
}

/** Apply resolved theme to <html data-theme> before React paint when possible. */
export function applyThemeToDocument(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  return resolved;
}
