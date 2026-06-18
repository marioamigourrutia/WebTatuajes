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

const quoteStatuses = ["pending", "contacted", "closed", "spam"] as const;

const quoteStatusLabels: Record<(typeof quoteStatuses)[number], string> = {
  pending: "Pendiente",
  contacted: "Contactado",
  closed: "Cerrado",
  spam: "Spam",
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
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingQuoteId, setUpdatingQuoteId] = useState<string | null>(null);

  async function checkServerStatus() {
    if (!user) {
      setError("Iniciá sesión antes de validar el rol en el servidor.");
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

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

  async function updateQuoteStatus(quoteId: string, status: string) {
    if (!user) {
      setError("Iniciá sesión antes de cambiar el estado.");
      return;
    }

    setUpdatingQuoteId(quoteId);
    setError(null);
    setNotice(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/quotes/status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quoteId, status }),
      });
      const body = (await response.json()) as { error?: string; status?: string };

      if (!response.ok || !body.status) {
        setError(body.error ?? "No se pudo actualizar el estado de la solicitud.");
        return;
      }

      setQuotes((currentQuotes) =>
        currentQuotes.map((quote) =>
          quote.id === quoteId ? { ...quote, status: body.status ?? quote.status } : quote,
        ),
      );
      setNotice("Estado actualizado desde ruta server-side con rol admin validado.");
    } catch {
      setError("No se pudo conectar con la ruta server-side de actualización.");
    } finally {
      setUpdatingQuoteId(null);
    }
  }

  return (
    <div className="space-y-5 rounded-3xl border border-stone-700 bg-stone-950/70 p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
          Operaciones
        </p>
        <h1 className="mt-3 text-3xl font-black text-stone-50">Dashboard admin local</h1>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          Validá el token contra servidor, revisá cotizaciones recientes y actualizá estados sin
          abrir escrituras cliente en Firestore.
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
        <div className="grid gap-3 rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-sm text-stone-200 sm:grid-cols-2">
          <p>Autenticado: {status.authenticated ? "sí" : "no"}</p>
          <p>Admin server-side: {status.admin ? "sí" : "no"}</p>
          <p>Rol servidor: {status.profile?.role ?? "sin perfil válido"}</p>
          <p>Usuario: {status.profile?.email ?? status.profile?.uid ?? "n/a"}</p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}

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
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Estado interno
                    </label>
                    <select
                      className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={updatingQuoteId === quote.id}
                      onChange={(event) => updateQuoteStatus(quote.id, event.target.value)}
                      value={quote.status}
                    >
                      {quoteStatuses.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {quoteStatusLabels[statusOption]}
                        </option>
                      ))}
                    </select>
                    {updatingQuoteId === quote.id ? (
                      <span className="text-sm text-stone-400">Actualizando…</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
