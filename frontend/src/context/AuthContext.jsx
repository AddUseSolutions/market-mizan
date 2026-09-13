import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { setAuthToken } from "../api";

const AuthContext = createContext(null);
const TOKEN_KEY = "mmizan_auth_token";
const USER_KEY = "mmizan_auth_user";

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function readStoredUser() {
  const raw = safeGet(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistSession(nextToken, nextUser) {
  if (nextToken) safeSet(TOKEN_KEY, nextToken);
  else safeRemove(TOKEN_KEY);
  if (nextUser) safeSet(USER_KEY, JSON.stringify(nextUser));
  else safeRemove(USER_KEY);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = safeGet(TOKEN_KEY) || "";
    const user = readStoredUser();
    // Token without user is unusable — clear so ProtectedRoute does not flap.
    if (stored && !user) {
      safeRemove(TOKEN_KEY);
      setAuthToken("");
      return "";
    }
    setAuthToken(stored);
    return stored;
  });
  const [user, setUser] = useState(() => readStoredUser());

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    const onUnauthorized = () => {
      safeRemove(TOKEN_KEY);
      safeRemove(USER_KEY);
      setAuthToken("");
      setToken("");
      setUser(null);
    };
    window.addEventListener("mmizan:unauthorized", onUnauthorized);
    return () => window.removeEventListener("mmizan:unauthorized", onUnauthorized);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      async loginWithPassword(payload) {
        const response = await api.post("/auth/login", payload);
        const nextToken = response.data?.token || "";
        const nextUser = response.data?.user || null;
        persistSession(nextToken, nextUser);
        setAuthToken(nextToken);
        setToken(nextToken);
        setUser(nextUser);
      },
      loginWithToken(nextToken, nextUser) {
        persistSession(nextToken, nextUser);
        setAuthToken(nextToken);
        setToken(nextToken);
        setUser(nextUser);
      },
      async register(payload) {
        const response = await api.post("/auth/register", payload);
        const nextToken = response.data?.token || "";
        const nextUser = response.data?.user || null;
        persistSession(nextToken, nextUser);
        setAuthToken(nextToken);
        setToken(nextToken);
        setUser(nextUser);
      },
      logout() {
        persistSession("", null);
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
