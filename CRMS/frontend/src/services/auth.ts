/** Firebase Authentication Service */
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  Auth
} from 'firebase/auth';
import api from './api';

let auth: Auth | null = null;

// Initialize Firebase Auth
export const initAuth = (firebaseAuth: Auth) => {
  auth = firebaseAuth;
};

export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }
  return auth;
};

export interface UserData {
  id: string;
  email: string;
  display_name: string;
  role: string;
  tenant_id: string;
  [key: string]: any;
}

export interface AuthResponse {
  authenticated: boolean;
  user?: UserData;
  message?: string;
}

/**
 * Sign in with email and password
 */
export const signIn = async (email: string, password: string): Promise<{ user: UserData; idToken: string }> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth!, email, password);
    const idToken = await userCredential.user.getIdToken();
    
    // Verify token with backend
    const response = await api.post('/auth/verify', { idToken });
    const data: AuthResponse = response.data;
    
    if (!data.authenticated) {
      throw new Error(data.message || 'Authentication failed');
    }
    
    // Store token and user data
    localStorage.setItem('idToken', idToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return { user: data.user!, idToken };
  } catch (error: any) {
    throw new Error(error.message || 'Sign in failed');
  }
};

/**
 * Register a new user
 */
export const register = async (
  email: string,
  password: string,
  displayName: string,
  tenantId?: string
): Promise<{ user: UserData; idToken: string }> => {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
    const idToken = await userCredential.user.getIdToken();
    
    // Register with backend
    const response = await api.post('/auth/register', {
      email,
      password,
      display_name: displayName,
      tenant_id: tenantId,
    });
    
    // Store token and user data
    localStorage.setItem('idToken', idToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    return { user: response.data.user, idToken };
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
};

/**
 * Sign out
 */
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth!);
    localStorage.removeItem('idToken');
    localStorage.removeItem('user');
  } catch (error: any) {
    throw new Error(error.message || 'Sign out failed');
  }
};

/**
 * Get current user from storage
 */
export const getCurrentUser = (): UserData | null => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

/**
 * Get current auth token
 */
export const getIdToken = (): string | null => {
  return localStorage.getItem('idToken');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getIdToken() && !!getCurrentUser();
};

/**
 * Refresh the auth token
 */
export const refreshToken = async (): Promise<string | null> => {
  try {
    if (!auth?.currentUser) return null;
    const idToken = await auth.currentUser.getIdToken(true);
    localStorage.setItem('idToken', idToken);
    return idToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};


