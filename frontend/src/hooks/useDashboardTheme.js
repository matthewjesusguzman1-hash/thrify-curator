import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "thrifty_curator_dashboard_theme";

export function useDashboardTheme() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "dark";
  });

  const isDark = theme === "dark";

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, isDark, toggleTheme };
}
