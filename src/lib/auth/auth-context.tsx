"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

type AuthState = {
  firebaseConfigured: boolean;
  loading: boolean;
  user: User | null;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useMemo(() => getFirebaseAuth(), []);
  const firebaseConfigured = auth !== null;
  const [loading, setLoading] = useState(firebaseConfigured);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) {
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    async function prepareAuthSession() {
      try {
        // Mantiene la autenticación únicamente durante la sesión de esta pestaña.
        // Evita que una sesión administrativa quede compartida mediante localStorage
        // con otras pestañas/ventanas usadas por visitantes del sitio.
        await setPersistence(auth, browserSessionPersistence);

        if (cancelled) return;

        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        });
      } catch {
        // Si el navegador no permite sessionStorage, no conservamos una sesión
        // potencialmente compartida. Cerramos Firebase Auth por seguridad.
        await signOut(auth).catch(() => undefined);

        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    void prepareAuthSession();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [auth]);

  const value = useMemo(
    () => ({ firebaseConfigured, loading, user }),
    [firebaseConfigured, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
