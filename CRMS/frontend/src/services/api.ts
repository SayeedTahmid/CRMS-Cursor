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
  timeout: 30000, // Increased timeout to 30 seconds for slower connections
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
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');

           // Handle timeout errors specially
           if (isTimeout) {
             // Only log once per endpoint type to reduce console noise
             const url = error.config?.url || 'unknown';
             if (!isTimeout || !window.__timeout_warnings) {
               window.__timeout_warnings = new Set();
             }
             if (!window.__timeout_warnings.has(url)) {
               window.__timeout_warnings.add(url);
               console.warn("⏱️ Request timeout:", url);
               console.warn("💡 Tip: Make sure backend is running on", API_URL);
               console.warn("💡 Run: cd CRMS/backend && python app.py");
             }
             // Don't redirect on timeout for auth endpoints - let them handle it
             if (!error.config?.url?.includes('/auth/')) {
               return Promise.reject(error);
             }
           }

    if (status === 401) {
      console.warn("⚠️ Unauthorized: Token may be expired or invalid.");
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("idToken");
        localStorage.removeItem("user");
        window.location.href = "/login"; // Redirect to login
      }
    } else if (status === 404) {
      console.warn("❌ API endpoint not found:", error.config?.url);
    } else if (status >= 500) {
      console.error("💥 Server error:", error.response?.data || error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
