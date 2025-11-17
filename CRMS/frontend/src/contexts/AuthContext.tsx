// frontend/src/contexts/AuthContext.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onIdTokenChanged, User } from "firebase/auth";
import axios from "axios";
import { auth } from "../services/firebase";
import { signOutUser } from "../services/auth";

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: string;
  tenant_id?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  authenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(false);

  const API_BASE =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";

  /**
   * 🩺 Check backend availability (runs once and on interval)
   */
  const checkBackendStatus = async (): Promise<void> => {
    try {
      const res = await axios.get(`${API_BASE}/auth/status`, { timeout: 5000 });
      if (res.data?.status === "ok") {
        if (!backendReady) console.log("✅ Backend connected");
        setBackendReady(true);
      } else {
        setBackendReady(false);
      }
    } catch (err) {
      if (backendReady) console.warn("⚠️ Backend not reachable:", (err as Error).message);
      setBackendReady(false);
    }
  };

  /**
   * 🔐 Verify Firebase token with backend (non-blocking)
   */
  const verifyTokenWithBackend = async (firebaseUser: User): Promise<void> => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await axios.post(`${API_BASE}/auth/verify`, { idToken }, { timeout: 10000 });

      if (response.data?.authenticated && response.data?.user) {
        // Update user data from backend
        const backendUser = response.data.user;
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: backendUser.display_name || backendUser.displayName || firebaseUser.displayName || firebaseUser.email,
          role: backendUser.role || 'viewer',
          tenant_id: backendUser.tenant_id || backendUser.tenantId || 'default',
          ...backendUser,
        });
        localStorage.setItem("idToken", idToken);
        if (backendUser) {
          localStorage.setItem("user", JSON.stringify(backendUser));
        }
      }
    } catch (err) {
      // Backend verification failed - but Firebase auth succeeded
      // Don't set user to null - use Firebase user data instead
      const errorMsg = (err as Error).message;
      // Only log timeout warnings once
      if (errorMsg.includes('timeout') && !window.__backend_timeout_logged) {
        window.__backend_timeout_logged = true;
        console.warn("⚠️ Backend verification timeout - backend may be slow or unavailable");
        console.warn("💡 This is normal if the backend is not running. The app will work with Firebase auth.");
        console.warn("💡 To start the backend: cd CRMS/backend && python app.py");
      } else if (!errorMsg.includes('timeout')) {
        console.warn("Backend verification failed (using Firebase auth):", errorMsg);
      }
    }
  };

  /**
   * 👂 Handle Firebase auth changes
   */
  useEffect(() => {
    let mounted = true;
    let interval: NodeJS.Timeout;
  
    // Check backend on mount
    checkBackendStatus();
    interval = setInterval(checkBackendStatus, 30000);
  
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!mounted) return;
      setLoading(true);
  
      if (!firebaseUser) {
        // User logged out manually
        localStorage.removeItem("idToken");
        localStorage.removeItem("user");
        setUser(null);
        setLoading(false);
        return;
      }
  
      // Set user immediately from Firebase (don't wait for backend)
      const idToken = await firebaseUser.getIdToken();
      localStorage.setItem("idToken", idToken);
      
      // Try to get user data from localStorage first
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: userData.display_name || userData.displayName || firebaseUser.displayName || firebaseUser.email,
            role: userData.role || 'viewer',
            tenant_id: userData.tenant_id || userData.tenantId || 'default',
            ...userData,
          });
          setLoading(false);
        } catch (e) {
          // If parsing fails, use Firebase data
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email,
            role: 'viewer',
            tenant_id: 'default',
          });
          setLoading(false);
        }
      } else {
        // No stored user data - use Firebase data immediately
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email,
          role: 'viewer',
          tenant_id: 'default',
        });
        setLoading(false);
      }
  
      // Try to verify with backend in background (non-blocking)
      if (backendReady) {
        // Don't await - let it run in background
        verifyTokenWithBackend(firebaseUser).catch(() => {
          // Already logged warning in verifyTokenWithBackend
        });
      } else {
        // Wait for backend, but don't block user
        const waitForBackend = async (retries = 3): Promise<void> => {
          for (let i = 0; i < retries; i++) {
            await new Promise((r) => setTimeout(r, 1000));
            if (backendReady) {
              verifyTokenWithBackend(firebaseUser).catch(() => {});
              return;
            }
          }
          // Backend still not ready after waiting - that's OK
          console.log("Backend not ready yet - will verify when available");
        };
        waitForBackend();
      }
    });
  
    return () => {
      mounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [backendReady]);
  
  /**
   * 🚪 Logout
   */
  const logout = async (): Promise<void> => {
    try {
      await signOutUser();
      setUser(null);
      localStorage.removeItem("idToken");
    } catch (err) {
      console.error("Logout failed:", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticated: !!user,
        logout,
      }}
    >
      {loading ? (
        <div className="text-center p-4 text-gray-400">Loading...</div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
