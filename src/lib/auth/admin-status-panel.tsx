"use client";

import { useState } from "react";
import { LoginPanel } from "@/lib/auth/login-panel";
import { useAuth } from "@/lib/auth/auth-context";

type AdminStatusResponse = {
  authenticated: boolean;
  admin: boolean;
  profile: { uid: string; email: string | null; role: string } | null;
};

export function AdminStatusPanel() {
  const { user } = useAuth();
  const [status, setStatus] = useState<AdminStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkServerStatus() {
    if (!user) {
      setError("Iniciá sesión antes de validar el rol en el servidor.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/status", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = (await response.json()) as AdminStatusResponse;

      setStatus(body);
      if (!response.ok) {
        setError("El servidor no pudo validar un perfil con rol permitido.");
      }
    } catch {
      setError("No se pudo consultar el estado de admin en el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 rounded-3xl border border-stone-700 bg-stone-950/70 p-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-50">Estado admin local</h2>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          Este flujo usa login cliente solo para obtener un ID token. La autorización real se valida
          en el servidor contra Firebase Admin y el documento <code>profiles/{"{uid}"}</code>.
        </p>
      </div>

      <LoginPanel />

      <button
        className="rounded-full bg-amber-300 px-5 py-2 font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!user || loading}
        onClick={checkServerStatus}
        type="button"
      >
        {loading ? "Validando…" : "Validar rol en servidor"}
      </button>

      {status ? (
        <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-sm text-stone-200">
          <p>Autenticado: {status.authenticated ? "sí" : "no"}</p>
          <p>Admin: {status.admin ? "sí" : "no"}</p>
          <p>Rol servidor: {status.profile?.role ?? "sin perfil válido"}</p>
          <p>Usuario: {status.profile?.email ?? status.profile?.uid ?? "n/a"}</p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
