import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

type AuthContextValue = {
  token: string | null;
  setToken: (token: string | null) => void;
  triggerExpiry: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem("reflex_admin_token");
  });

  const setToken = useCallback((newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("reflex_admin_token", newToken);
    } else {
      localStorage.removeItem("reflex_admin_token");
    }
    setTokenState(newToken);
  }, []);

  // Lets any part of the app signal that the admin token has expired
  const triggerExpiry = useCallback(() => {
    window.dispatchEvent(new CustomEvent("sessionExpired"));
  }, []);

  return React.createElement(
    AuthContext.Provider,
    { value: { token, setToken, triggerExpiry } },
    children
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
