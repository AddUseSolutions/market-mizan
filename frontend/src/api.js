import axios from "axios";

const apiBase =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3001" : "");

const TOKEN_KEY = "mmizan_auth_token";

const api = axios.create({
  baseURL: `${apiBase}/api`
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
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${stored}`;
  }
  return config;
});

const bootToken = localStorage.getItem(TOKEN_KEY);
if (bootToken) setAuthToken(bootToken);

export default api;
