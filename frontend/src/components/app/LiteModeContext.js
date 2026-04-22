import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

/**
 * LiteModeContext — a per-inspector toggle that simplifies the app for
 * inspectors who only perform Level III inspections.
 *
 * When ON:
 * - Dashboard table / tree / AI + basic search show only Level III violations
 *   (level_iii === "Y") and respect the Favorites branch.
 * - The filter row collapses to a single prominent OOS toggle.
 * - The header nav buttons hide everything except Level 3, HOS, Photos,
 *   Inspections, and Resources.
 * - The "Steps" button on Dashboard is relabelled to "Level 3 Steps".
 *
 * Preference persists in localStorage per-badge so it survives sign-out and
 * cold boot.
 */
const LiteModeContext = createContext({ liteMode: false, setLiteMode: () => {} });
const KEY = (badge) => `inspnav_lite_mode_${badge || "anon"}`;

export function LiteModeProvider({ children }) {
  const { badge } = useAuth();
  const [liteMode, setLiteModeState] = useState(false);

  // Load once per badge change.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY(badge));
      setLiteModeState(raw === "1");
    } catch { setLiteModeState(false); }
  }, [badge]);

  const setLiteMode = useCallback((next) => {
    setLiteModeState(next);
    try { localStorage.setItem(KEY(badge), next ? "1" : "0"); } catch { /* ignore */ }
  }, [badge]);

  return (
    <LiteModeContext.Provider value={{ liteMode, setLiteMode }}>
      {children}
    </LiteModeContext.Provider>
  );
}

export function useLiteMode() {
  return useContext(LiteModeContext);
}
