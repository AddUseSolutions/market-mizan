import axios from "axios";

const apiBase =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3001" : "");

const TOKEN_KEY = "mmizan_auth_token";

const api = axios.create({
  baseURL: `${apiBase}/api`,
  timeout: 30000
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete api.defaults.headers.common.Authorization;
}

// Always attach the latest token from localStorage so early dashboard
// requests do not race the AuthProvider useEffect.
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${stored}`;
    }
  } catch {
    /* private mode */
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      const url = String(error?.config?.url || "");
      // Failed credential checks must not clear / thrash the session.
      const isAuthAttempt =
        /\/auth\/(login|register|set-password|forgot-password|reset-password)/i.test(url);
      if (!isAuthAttempt) {
        window.dispatchEvent(new CustomEvent("mmizan:unauthorized"));
      }
    }
    return Promise.reject(error);
  }
);

try {
  const bootToken = localStorage.getItem(TOKEN_KEY);
  if (bootToken) setAuthToken(bootToken);
} catch {
  /* ignore */
}

export default api;
