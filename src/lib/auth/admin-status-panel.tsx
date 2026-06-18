"use client";

import { useState } from "react";
import { LoginPanel } from "@/lib/auth/login-panel";
import { useAuth } from "@/lib/auth/auth-context";

type AdminStatusResponse = {
  authenticated: boolean;
  admin: boolean;
  profile: { uid: string; email: string | null; role: string } | null;
};

type RecentQuoteRequest = {
  id: string;
  createdAt: string | null;
  customerName: string;
  email: string;
  phone: string | null;
  status: string;
  preferredContactMethod: string;
  bodyPlacement: string;
  approximateSize: string;
  descriptionPreview: string;
  budgetClp: number | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "sin fecha";
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminStatusPanel() {
  const { user } = useAuth();
  const [status, setStatus] = useState<AdminStatusResponse | null>(null);
  const [quotes, setQuotes] = useState<RecentQuoteRequest[]>([]);
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
        setQuotes([]);
        return;
      }

      if (!body.admin) {
        setError("El perfil autenticado no tiene rol admin en el servidor.");
        setQuotes([]);
        return;
      }

      const quotesResponse = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const quotesBody = (await quotesResponse.json()) as { quotes?: RecentQuoteRequest[] };

      if (!quotesResponse.ok) {
        setError("El servidor no pudo listar solicitudes de cotización.");
        setQuotes([]);
        return;
      }

      setQuotes(quotesBody.quotes ?? []);
    } catch {
      setError("No se pudo consultar el estado de admin en el servidor.");
      setQuotes([]);
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

      {status?.admin ? (
        <section className="space-y-3">
          <div>
            <h3 className="text-xl font-bold text-stone-50">Solicitudes recientes</h3>
            <p className="mt-1 text-sm text-stone-400">
              Esta lista viene de una ruta server-side que vuelve a validar el ID token y el rol
              admin.
            </p>
          </div>
          {quotes.length === 0 ? (
            <p className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-sm text-stone-400">
              Todavía no hay solicitudes locales.
            </p>
          ) : (
            <ul className="space-y-3">
              {quotes.map((quote) => (
                <li
                  key={quote.id}
                  className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-stone-100">{quote.customerName}</p>
                      <p className="text-sm text-stone-400">
                        {quote.email}
                        {quote.phone ? ` · ${quote.phone}` : ""} · {quote.preferredContactMethod}
                      </p>
                    </div>
                    <div className="text-sm text-stone-400 sm:text-right">
                      <p>{formatDate(quote.createdAt)}</p>
                      <p>Estado: {quote.status}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-stone-300">{quote.descriptionPreview}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                    {quote.bodyPlacement} · {quote.approximateSize}
                    {quote.budgetClp ? ` · $${quote.budgetClp.toLocaleString("es-CL")}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
