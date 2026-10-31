import axios from "axios";

export const TOKEN_KEY = "devflow_token";

// Local development falls back to the default Express port. Deployments and
// previews can point at another API by setting VITE_API_URL at build time.
const API_BASE_URL =
  (import.meta.env.VITE_API_URL || "").trim() || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
