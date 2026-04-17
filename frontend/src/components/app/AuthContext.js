import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "safespect-badge";

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
