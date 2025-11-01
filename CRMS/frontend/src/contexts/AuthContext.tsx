// frontend/src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  UserData,
  getCurrentUser,
  isAuthenticated,
  signOutUser,
} from "../services/auth";
import { auth } from "../services/firebase"; // adjust import path if your firebase export is elsewhere
import { onIdTokenChanged } from "firebase/auth";

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  authenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Keep localStorage idToken updated whenever Firebase refreshes the token
  useEffect(() => {
    let isInitial = true;

    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          const token = await fbUser.getIdToken();
          localStorage.setItem("idToken", token);
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || null,
          });
        } else {
          if (!isInitial){
            localStorage.removeItem("idToken");
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Error refreshing ID token:", err);
        localStorage.removeItem("idToken");
        setUser(null);
      } finally {
        setLoading(false);
        isInitial= false;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // simple logout wrapper used by pages
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

  // If auth state already exists (on initial load), hydrate user
 /* useEffect(() => {
    const cur = getCurrentUser();
    if (cur) setUser(cur);
    setLoading(false);
  }, []); */

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticated: !!user && isAuthenticated(),
        logout,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
