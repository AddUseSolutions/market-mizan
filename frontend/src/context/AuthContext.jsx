import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { setAuthToken } from "../api";

const AuthContext = createContext(null);
const TOKEN_KEY = "mmizan_auth_token";
const USER_KEY = "mmizan_auth_user";

function readStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem(TOKEN_KEY) || "";
    setAuthToken(stored);
    return stored;
  });
  const [user, setUser] = useState(() => readStoredUser());

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      async loginWithPassword(payload) {
        const response = await api.post("/auth/login", payload);
        const nextToken = response.data?.token || "";
        const nextUser = response.data?.user || null;
        localStorage.setItem(TOKEN_KEY, nextToken);
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        setAuthToken(nextToken);
        setToken(nextToken);
        setUser(nextUser);
      },
      loginWithToken(nextToken, nextUser) {
        localStorage.setItem(TOKEN_KEY, nextToken);
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        setAuthToken(nextToken);
        setToken(nextToken);
        setUser(nextUser);
      },
      async register(payload) {
        const response = await api.post("/auth/register", payload);
        const nextToken = response.data?.token || "";
        const nextUser = response.data?.user || null;
        localStorage.setItem(TOKEN_KEY, nextToken);
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        setAuthToken(nextToken);
        setToken(nextToken);
        setUser(nextUser);
      },
      logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setAuthToken("");
        setToken("");
        setUser(null);
      }
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden.");
  return ctx;
}
