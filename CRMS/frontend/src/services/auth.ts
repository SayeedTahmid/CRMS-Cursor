// src/services/auth.ts
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import api from "./api";
import { auth } from "./firebase"; // ✅ make sure path is correct

/** ---- USER DATA INTERFACE ---- */
export interface UserData {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

/** ---- SIGN IN ---- */
export async function signIn(email: string, password: string): Promise<UserData> {
  try {
    // Step 1: Authenticate with Firebase (this is the main authentication)
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    // Step 2: Store Firebase token locally
    localStorage.setItem("idToken", idToken);

    // Step 3: Store basic user data immediately from Firebase (don't wait for backend)
    const basicUser = {
      id: user.uid,
      email: user.email,
      display_name: user.displayName || user.email || '',
      role: 'viewer',
      tenant_id: 'default',
    };
    localStorage.setItem("user", JSON.stringify(basicUser));

    // Step 4: Try to verify with backend in background (non-blocking - don't fail if backend is down)
    // This runs asynchronously and updates user data if backend is available
    setTimeout(() => {
      // Create a verification promise with longer timeout
      const verificationPromise = api.post("/auth/verify", { idToken }, {
        timeout: 15000 // 15 seconds timeout for verification
      }).then((verifyResponse: any) => {
        // Store user data from backend if available (updates the basic user data)
        if (verifyResponse?.data?.user) {
          localStorage.setItem("user", JSON.stringify(verifyResponse.data.user));
          console.log("✅ Backend verification successful - user data updated");
        } else if (verifyResponse?.data?.authenticated) {
          // If authenticated but no user data, that's still success
          console.log("✅ Backend verification successful");
        }
      });

      // Race with a timeout (longer timeout than axios)
      Promise.race([
        verificationPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Backend verification timeout")), 18000)
        )
      ]).catch((backendError: any) => {
        // Backend verification failed - log warning but continue (Firebase auth already succeeded)
        const errorMsg = backendError.message || backendError.response?.data?.error || 'Unknown error';
        if (errorMsg.includes('timeout') || errorMsg.includes('ECONNABORTED')) {
          console.warn("⚠️ Backend verification timeout - backend may be slow or unavailable");
        } else {
          console.warn("⚠️ Backend verification failed (login still works):", errorMsg);
        }
        // Don't show the message about limited features - backend is connected, just slow
      });
    }, 100); // Small delay to let login complete first

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    };
  } catch (error: any) {
    console.error("Sign-in error:", error);
    
    // Handle Firebase auth errors specifically
    if (error.code === 'auth/user-not-found') {
      throw new Error("No account found with this email");
    } else if (error.code === 'auth/wrong-password') {
      throw new Error("Incorrect password");
    } else if (error.code === 'auth/invalid-email') {
      throw new Error("Invalid email address");
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error("Too many failed attempts. Please try again later");
    } else if (error.message?.includes('timeout')) {
      throw new Error("Connection timeout. Please check if backend is running");
    }
    
    throw new Error(error.message || "Sign-in failed");
  }
}

/** ---- REGISTER ---- */
export async function register(email: string, password: string, displayName?: string) {
  try {
    // Step 1: Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    // Step 2: Create Firestore user record (without password, user already exists in Firebase)
    await api.post("/auth/register", {
      email,
      display_name: displayName || email,
      firebase_uid: user.uid,  // Send UID so backend knows user is already created
    }, {
      headers: {
        Authorization: `Bearer ${idToken}`,  // Include token for verification
      }
    });

    localStorage.setItem("idToken", idToken);
    
    // Store user data
    const userData = {
      id: user.uid,
      email: user.email,
      display_name: displayName || email || user.email,
      role: 'viewer',
      tenant_id: 'default',
    };
    localStorage.setItem("user", JSON.stringify(userData));

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    };
  } catch (error: any) {
    console.error("Register error:", error);
    
    // Handle Firebase auth errors specifically
    if (error.code === 'auth/email-already-in-use') {
      throw new Error("An account with this email already exists");
    } else if (error.code === 'auth/invalid-email') {
      throw new Error("Invalid email address");
    } else if (error.code === 'auth/weak-password') {
      throw new Error("Password is too weak");
    } else if (error.response?.status === 400) {
      // Backend returned 400 - show backend error message
      const errorMsg = error.response?.data?.error || "Registration failed";
      throw new Error(errorMsg);
    }
    
    throw new Error(error.message || "Registration failed");
  }
}

/** ---- GET CURRENT USER ---- */
export function getCurrentUser(): UserData | null {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  return {
    uid: currentUser.uid,
    email: currentUser.email,
    displayName: currentUser.displayName,
  };
}

/** ---- CHECK AUTH STATUS ---- */
export async function isAuthenticated(): Promise<boolean> {
  const token = localStorage.getItem("idToken");
  if (!token) return false;

  // Check if Firebase user is still authenticated (quick check)
  const currentUser = auth.currentUser;
  if (!currentUser) {
    localStorage.removeItem("idToken");
    localStorage.removeItem("user");
    return false;
  }

  // Try to verify with backend if available (non-blocking)
  try {
    const res = await Promise.race([
      api.post("/auth/verify", { idToken: token }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 3000)
      )
    ]) as any;
    
    if (res?.data?.authenticated && res?.data?.user) {
      localStorage.setItem("user", JSON.stringify(res.data.user));
      return true;
    }
  } catch (err) {
    // Backend check failed - but Firebase auth is still valid
    console.warn("Backend auth check failed (using Firebase auth):", (err as Error).message);
  }

  // If Firebase user exists, we're authenticated (even if backend check failed)
  return !!currentUser;
}


/** ---- LOGOUT ---- */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
    localStorage.removeItem("idToken");
    console.log("User logged out successfully");
  } catch (err) {
    console.error("Logout failed:", err);
    throw err;
  }
}
