import axios from "axios";

const rawBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";
// Normalize URL (no trailing slash)
const API_URL = rawBase.replace(/\/$/, "");

console.log("Using API base URL:",API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("idToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized: Token may be expired or invalid.");
    } else if (error.response?.status === 404) {
      console.warn("Endpoint not found:", error.config?.url);
    }
    return Promise.reject(error);
  }
);

export default api;
