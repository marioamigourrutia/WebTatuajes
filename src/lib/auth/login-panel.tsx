"use client";

import { useState, type FormEvent } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useAuth } from "@/lib/auth/auth-context";
import { getFirebaseAuth } from "@/lib/firebase/client";

export function LoginPanel() {
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
      await signInWithEmailAndPassword(auth, email, password);
      setPassword("");
    } catch {
      setError("No se pudo iniciar sesión. Revisá el email y la contraseña.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
    }
  }

  if (loading) {
    return <p className="text-sm text-stone-400">Preparando autenticación…</p>;
  }

  if (!firebaseConfigured) {
    return (
      <p className="text-sm text-stone-400">
        Login preparado. Configurá `NEXT_PUBLIC_FIREBASE_*` en `.env.local` para habilitar Firebase
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
