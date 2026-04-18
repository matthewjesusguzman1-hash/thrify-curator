import { createContext, useContext, useState, useCallback, useEffect } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "safespect-badge";
const API = process.env.REACT_APP_BACKEND_URL;

export function AuthProvider({ children }) {
  const [badge, setBadge] = useState(() => localStorage.getItem(STORAGE_KEY) || "");

  const login = useCallback((b) => {
    localStorage.setItem(STORAGE_KEY, b);
    setBadge(b);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setBadge("");
  }, []);

  /* Heartbeat — update last_active every 5 minutes */
  useEffect(() => {
    if (!badge) return;
    const ping = () => {
      fetch(`${API}/api/auth/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badge }),
      }).catch(() => {});
    };
    ping();
    const interval = setInterval(ping, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [badge]);

  return (
    <AuthContext.Provider value={{ badge, login, logout, isLoggedIn: !!badge }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
