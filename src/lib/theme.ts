export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "lab_theme";

export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");document.documentElement.setAttribute("data-theme",t==="light"||t==="dark"?t:"${DEFAULT_THEME}");}catch(e){document.documentElement.setAttribute("data-theme","${DEFAULT_THEME}");}})();`;
