// src/services/api.ts
import axios from "axios";
import { auth } from "./firebase"; // for optional silent refresh on 401

// 1) Get base URL from .env or fallback
const rawBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";
// 2) Normalize trailing slash
const API_URL = rawBase.replace(/\/$/, "");

if (import.meta.env.DEV) console.log("🔗 Using API base URL:", API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// 3) Attach Firebase ID token (we only store 'idToken')
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("idToken");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 4) Optional: on 401, try a single silent token refresh
let isRefreshing = false;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status;
    const original = error.config;

    if (status === 401 && !original?._retry) {
      original._retry = true;

      try {
        if (!isRefreshing) {
          isRefreshing = true;
          const user = auth.currentUser;
          if (user) {
            const fresh = await user.getIdToken(true);
            localStorage.setItem("idToken", fresh);
          }
          isRefreshing = false;
        }
        // Re-attach fresh token and retry the request
        const freshToken = localStorage.getItem("idToken");
        if (freshToken) {
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${freshToken}`;
        }
        return api(original);
      } catch (e) {
        // fall through to global handling
      } finally {
        isRefreshing = false;
      }
    }

    // Global handling
    if (status === 401) {
      console.warn("⚠️ Unauthorized: token invalid/expired. Redirecting to login.");
      localStorage.removeItem("idToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    } else if (status === 404) {
      console.warn("❌ API endpoint not found:", error.config?.url);
    } else if (status >= 500) {
      console.error("💥 Server error:", error.response?.data || error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
