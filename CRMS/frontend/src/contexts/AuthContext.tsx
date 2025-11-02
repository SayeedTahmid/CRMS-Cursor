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
   * 🔐 Verify Firebase token with backend
   */
  const verifyTokenWithBackend = async (firebaseUser: User): Promise<void> => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await axios.post(`${API_BASE}/auth/verify`, { idToken });

      if (response.data?.authenticated) {
        setUser(response.data.user);
        localStorage.setItem("idToken", idToken);
      } else {
        console.warn("Backend rejected token:", response.data?.error);
        setUser(null);
      }
    } catch (err) {
      console.error("Token verification error:", (err as Error).message);
      setUser(null);
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
        setUser(null);
        setLoading(false);
        return;
      }
  
      // If backend not yet ready, wait and retry instead of logging out
      if (!backendReady) {
        console.warn("⏳ Waiting for backend before verifying user...");
        const waitForBackend = async (retries = 5): Promise<void> => {
          for (let i = 0; i < retries; i++) {
            await new Promise((r) => setTimeout(r, 1000));
            if (backendReady) {
              await verifyTokenWithBackend(firebaseUser);
              setLoading(false);
              return;
            }
          }
          console.error("❌ Backend unavailable after waiting, skipping verification.");
          setLoading(false);
        };
        waitForBackend();
        return;
      }
  
      await verifyTokenWithBackend(firebaseUser);
      setLoading(false);
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
