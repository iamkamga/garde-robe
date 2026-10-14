import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./lib/api.js";

const AuthContext = createContext(null);
const HEARTBEAT_MS = 60_000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api("/auth/me");
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Signal de présence : permet à l'admin de voir qui est en ligne.
  useEffect(() => {
    if (!user) return;
    const id = setInterval(refresh, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [user, refresh]);

  const login = async (email, password) => {
    const { user } = await api("/auth/login", { method: "POST", body: { email, password } });
    setUser(user);
    return user;
  };

  const register = async (name, email, password) => {
    const { user } = await api("/auth/register", { method: "POST", body: { name, email, password } });
    setUser(user);
    return user;
  };

  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
