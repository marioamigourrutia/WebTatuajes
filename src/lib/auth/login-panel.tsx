"use client";

import { useState, type FormEvent } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useAuth } from "@/lib/auth/auth-context";
import { getAdminSessionFailureMessage, getLoginFailureMessage } from "@/lib/auth/login-errors";
import { getFirebaseAuth } from "@/lib/firebase/client";

type LoginPanelProps = {
  onSessionCleared?: () => void;
  onSessionEstablished?: (status: {
    authenticated: boolean;
    admin: boolean;
    profile: { uid: string; email: string | null; role: string } | null;
  }) => void;
};

export function LoginPanel({ onSessionCleared, onSessionEstablished }: LoginPanelProps) {
  const { firebaseConfigured, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const auth = getFirebaseAuth();
    if (!auth) {
      setError("Firebase Auth todavía no está configurado para este entorno.");
      return;
    }

    setSubmitting(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = (await response.json()) as {
        authenticated: boolean;
        admin: boolean;
        profile: { uid: string; email: string | null; role: string } | null;
        error?: string;
      };

      if (!response.ok || !body.admin) {
        await signOut(auth);
        setError(getAdminSessionFailureMessage(body.error));
        return;
      }

      onSessionEstablished?.(body);
      setPassword("");
    } catch (loginError) {
      setError(getLoginFailureMessage(loginError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    const auth = getFirebaseAuth();
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
    } finally {
      onSessionCleared?.();

      if (auth) {
        await signOut(auth);
      }
    }
  }

  if (loading) {
    return <p className="text-sm text-stone-400">Preparando autenticación…</p>;
  }

  if (!firebaseConfigured) {
    return (
      <p className="text-sm text-stone-400">
        Login preparado. Configura `NEXT_PUBLIC_FIREBASE_*` en `.env.local` para habilitar Firebase
        Auth localmente.
      </p>
    );
  }

  if (user) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-stone-300">Sesión iniciada como {user.email ?? user.uid}.</p>
        <button
          className="rounded-full border border-stone-500 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:border-stone-200"
          onClick={handleLogout}
          type="button"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={handleLogin}>
      <div>
        <label
          className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400"
          htmlFor="email"
        >
          Email
        </label>
        <input
          className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      <div>
        <label
          className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400"
          htmlFor="password"
        >
          Contraseña
        </label>
        <input
          className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
          id="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button
        className="rounded-full bg-amber-300 px-5 py-2 font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Ingresando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
