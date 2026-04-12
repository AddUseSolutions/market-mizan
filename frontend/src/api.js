import axios from "axios";

const apiBase =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3001" : "");

const api = axios.create({
  baseURL: `${apiBase}/api`
});

export default api;
