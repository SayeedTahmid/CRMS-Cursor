// src/services/api.ts
import axios from "axios";

// ✅ 1️⃣ Get base URL from .env or fallback
const rawBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";

// ✅ 2️⃣ Normalize: remove trailing slash
const API_URL = rawBase.replace(/\/$/, "");

// Debugging (only logs in dev mode)
if (import.meta.env.DEV) {
  console.log("🔗 Using API base URL:", API_URL);
}

// ✅ 3️⃣ Create reusable Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000, // Prevent hanging requests (10 seconds)
});

// ✅ 4️⃣ Add Authorization header if token exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken") || localStorage.getItem("idToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ 5️⃣ Global response handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      console.warn("⚠️ Unauthorized: Token may be expired or invalid.");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("idToken");
      localStorage.removeItem("user");
      window.location.href = "/login"; // Redirect to login
    } else if (status === 404) {
      console.warn("❌ API endpoint not found:", error.config?.url);
    } else if (status >= 500) {
      console.error("💥 Server error:", error.response?.data || error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
