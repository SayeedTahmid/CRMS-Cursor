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
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    // store Firebase token locally
    localStorage.setItem("idToken", idToken);

    // verify with backend
    await api.post("/auth/verify", { idToken });

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    };
  } catch (error: any) {
    console.error("Sign-in error:", error);
    throw new Error(error.message || "Sign-in failed");
  }
}

/** ---- REGISTER ---- */
export async function register(email: string, password: string, displayName?: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    await api.post("/auth/register", {
      email,
      password,
      display_name: displayName || email,
    });

    localStorage.setItem("idToken", idToken);

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    };
  } catch (error: any) {
    console.error("Register error:", error);
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

  try {
    // Verify with backend if token is valid
    const res = await api.post("/auth/verify", { idToken: token });
    return res.data?.authenticated === true;
  } catch (err) {
    console.warn("Auth check failed:", err);
    localStorage.removeItem("idToken");
    return false;
  }
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
