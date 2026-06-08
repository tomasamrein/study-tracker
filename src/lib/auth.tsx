"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, googleProvider, isFirebaseConfigured } from "./firebase";

export interface AuthUser {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
}

interface AuthValue {
  /** Modo nube (Firebase configurado) o local. */
  cloud: boolean;
  loading: boolean;
  user: AuthUser | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

// Usuario sintético para el modo local (sin Firebase): no requiere login.
const LOCAL_USER: AuthUser = {
  uid: "local",
  name: "Tomás",
  email: null,
  photoURL: null,
};

function toAuthUser(u: User): AuthUser {
  return {
    uid: u.uid,
    name: u.displayName,
    email: u.email,
    photoURL: u.photoURL,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const cloud = isFirebaseConfigured;
  const [user, setUser] = useState<AuthUser | null>(cloud ? null : LOCAL_USER);
  const [loading, setLoading] = useState(cloud);

  useEffect(() => {
    if (!cloud) return;
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ? toAuthUser(u) : null);
      setLoading(false);
    });
    return unsub;
  }, [cloud]);

  const value = useMemo<AuthValue>(
    () => ({
      cloud,
      loading,
      user,
      signIn: async () => {
        const auth = getFirebaseAuth();
        if (!auth) return;
        await signInWithPopup(auth, googleProvider);
      },
      signOut: async () => {
        const auth = getFirebaseAuth();
        if (!auth) return;
        await fbSignOut(auth);
      },
    }),
    [cloud, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
