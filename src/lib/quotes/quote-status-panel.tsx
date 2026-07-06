"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import type { ClientQuoteStatus } from "./quote-request";

const quoteStatusLabels: Record<string, string> = {
  pending: "Recibida, pendiente de revisión",
  contacted: "En contacto con el estudio",
  closed: "Cerrada",
  spam: "No procesada",
};

const calendarStatusLabels: Record<string, string> = {
  PENDING_CONFIRMATION: "Por confirmar",
  DEPOSIT_PENDING: "Por confirmar",
  DEPOSIT_VERIFIED: "Ocupado",
  CONFIRMED: "Ocupado",
  BLOCKED_BY_ADMIN: "Ocupado",
  CANCELLED: "Libre",
  RELEASED: "Libre",
};

type StatusState =
  | { status: "idle" | "loading"; quotes: ClientQuoteStatus[]; error: null }
  | { status: "ready"; quotes: ClientQuoteStatus[]; error: null }
  | { status: "error"; quotes: ClientQuoteStatus[]; error: string };

function buildStatusUrl(quoteCode: string) {
  const params = new URLSearchParams();

  if (quoteCode) {
    params.set("quoteCode", quoteCode);
  }

  return `/api/quotes/status${params.size ? `?${params.toString()}` : ""}`;
}

function formatPreferredDate(value: string | null) {
  if (!value) return "Sin fecha solicitada";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "full",
    timeZone: "America/Santiago",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function getStatusError(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const errors = (payload as { errors?: Record<string, unknown> }).errors;
  const formError = errors?.form;

  return typeof formError === "string" ? formError : null;
}

export function QuoteStatusPanel({ initialQuoteCode = "" }: { initialQuoteCode?: string }) {
  const { firebaseConfigured, loading, user } = useAuth();
  const [state, setState] = useState<StatusState>({ status: "idle", quotes: [], error: null });
  const quoteCode = useMemo(() => initialQuoteCode.trim().toUpperCase(), [initialQuoteCode]);

  useEffect(() => {
    if (loading || !user?.emailVerified) {
      return;
    }

    let cancelled = false;

    async function loadStatuses() {
      setState({ status: "loading", quotes: [], error: null });

      try {
        const token = await user!.getIdToken();
        const response = await fetch(buildStatusUrl(quoteCode), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await response.json()) as { quotes?: ClientQuoteStatus[] };

        if (cancelled) return;

        if (!response.ok) {
          setState({
            status: "error",
            quotes: [],
            error: getStatusError(payload) ?? "No pudimos cargar tus solicitudes.",
          });
          return;
        }

        setState({ status: "ready", quotes: payload.quotes ?? [], error: null });
      } catch {
        if (!cancelled) {
          setState({ status: "error", quotes: [], error: "No pudimos cargar tus solicitudes." });
        }
      }
    }

    void loadStatuses();

    return () => {
      cancelled = true;
    };
  }, [loading, quoteCode, user]);

  return (
    <section className="mb-6 rounded-3xl border border-amber-100/10 bg-stone-900/70 p-5 text-stone-200">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">
        Mis solicitudes
      </p>
      <h2 className="mt-2 text-2xl font-black text-stone-50">Estado con email verificado</h2>

      {!firebaseConfigured ? (
        <p className="mt-3 text-sm leading-6 text-stone-400">
          La consulta autenticada no está disponible temporalmente. Puedes usar el formulario con
          código y email más abajo.
        </p>
      ) : loading ? (
        <p className="mt-3 text-sm text-stone-400">Revisando tu sesión...</p>
      ) : !user ? (
        <p className="mt-3 text-sm leading-6 text-stone-400">
          Las nuevas cotizaciones se protegen con verificación por email. Si ya verificaste tu
          correo, abre el enlace de verificación en este dispositivo para ver tus solicitudes. El
          acceso anterior con código y email sigue disponible más abajo.
        </p>
      ) : !user.emailVerified ? (
        <p className="mt-3 text-sm leading-6 text-stone-400">
          Tu sesión existe, pero el email aún no está verificado. Usa el enlace de verificación para
          activar la consulta privada.
        </p>
      ) : state.status === "loading" ? (
        <p className="mt-3 text-sm text-stone-400">Cargando tus solicitudes...</p>
      ) : state.status === "error" ? (
        <p className="mt-3 text-sm text-red-300">{state.error}</p>
      ) : state.quotes.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-stone-400">
          No encontramos solicitudes asociadas a tu cuenta verificada
          {quoteCode ? " para ese código" : ""}.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {state.quotes.map((quote) => (
            <article
              className="rounded-2xl border border-stone-700 bg-stone-950/70 p-4 text-sm"
              key={quote.quoteCode}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-mono text-amber-200">{quote.quoteCode}</p>
                <p>{quoteStatusLabels[quote.status] ?? "En revisión"}</p>
              </div>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Fecha</dt>
                  <dd className="mt-1">{formatPreferredDate(quote.preferredTattooDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Reserva</dt>
                  <dd className="mt-1">
                    {quote.calendarDateStatus
                      ? (calendarStatusLabels[quote.calendarDateStatus] ?? "En revisión")
                      : "Sin reserva asociada"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Abono</dt>
                  <dd className="mt-1">
                    {quote.deposit?.verified
                      ? `Verificado por $${quote.deposit.amountClp.toLocaleString("es-CL")}`
                      : "Sin abono verificado publicado"}
                  </dd>
                </div>
              </dl>
              {quote.publicMessage ? (
                <p className="mt-3 rounded-xl border border-stone-700 bg-stone-900 p-3 leading-6">
                  {quote.publicMessage}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
