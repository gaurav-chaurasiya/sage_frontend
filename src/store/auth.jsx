import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { disconnectRealtime } from "../api/realtime";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("rivaah_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem("rivaah_access");
    if (!token) return false;
    try {
      return !localStorage.getItem("rivaah_user");
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const token = localStorage.getItem("rivaah_access");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me/")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("rivaah_user", JSON.stringify(res.data));
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  const login = (payload) => {
    localStorage.setItem("rivaah_access", payload.tokens.access);
    localStorage.setItem("rivaah_refresh", payload.tokens.refresh);
    localStorage.setItem("rivaah_user", JSON.stringify(payload.user));
    setUser(payload.user);
  };

  const applyUser = (next) => {
    localStorage.setItem("rivaah_user", JSON.stringify(next));
    setUser(next);
  };

  const applyTokens = (tokens) => {
    if (!tokens) return;
    localStorage.setItem("rivaah_access", tokens.access);
    localStorage.setItem("rivaah_refresh", tokens.refresh);
  };

  const logout = () => {
    disconnectRealtime();
    localStorage.removeItem("rivaah_access");
    localStorage.removeItem("rivaah_refresh");
    localStorage.removeItem("rivaah_user");
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, logout, setUser: applyUser, applyTokens }),
    [user, loading]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
