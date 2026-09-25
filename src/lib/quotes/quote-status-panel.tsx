"use client";

import { useState, type FormEvent } from "react";

type QuoteStatus = {
  quoteCode: string;
  preferredTattooDate: string | null;
  status: string;
  calendarDateStatus: string | null;
  deposit: {
    amountClp: number;
    paidAt: string;
    verified: boolean;
  } | null;
  publicMessage: string | null;
};

type QuoteStatusResponse = {
  quotes?: QuoteStatus[];
  errors?: { form?: string };
};

const quoteStatusLabels: Record<string, string> = {
  pending: "Recibida, pendiente de revisión",
  contacted: "En contacto",
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

function formatPreferredDate(value: string | null) {
  if (!value) return "Sin fecha solicitada";

  try {
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "full",
      timeZone: "America/Santiago",
    }).format(new Date(`${value}T12:00:00.000Z`));
  } catch {
    return value;
  }
}

export function QuoteStatusPanel({
  initialQuoteCode = "",
  initialEmail = "",
}: {
  initialQuoteCode?: string;
  initialEmail?: string;
}) {
  const [quoteCode, setQuoteCode] = useState(initialQuoteCode.trim().toUpperCase());
  const [email, setEmail] = useState(initialEmail.trim().toLowerCase());
  const [quote, setQuote] = useState<QuoteStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setQuote(null);

    try {
      const params = new URLSearchParams({
        quoteCode: quoteCode.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
      });
      const response = await fetch(`/api/quotes/status?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const body = (await response.json()) as QuoteStatusResponse;

      if (!response.ok) {
        setError(body.errors?.form ?? "No pudimos consultar la cotización en este momento.");
        return;
      }

      const nextQuote = body.quotes?.[0] ?? null;
      if (!nextQuote) {
        setError("No encontramos una cotización con esos datos.");
        return;
      }

      setQuote(nextQuote);
    } catch {
      setError("No pudimos conectar con el sistema de seguimiento. Intenta nuevamente en unos minutos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 rounded-[1.75rem] border border-white/10 bg-[#0a0a0c] p-5 sm:grid-cols-[1fr_1fr_auto] sm:p-6"
        onSubmit={handleSubmit}
      >
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
            Código de cotización
          </span>
          <input
            autoComplete="off"
            className="w-full rounded-xl border border-white/15 bg-[#111113] px-4 py-3 font-mono uppercase text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-white/35"
            onChange={(event) => setQuoteCode(event.target.value.toUpperCase())}
            placeholder="COT-2026-ABCDE"
            required
            value={quoteCode}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
            Email usado al cotizar
          </span>
          <input
            autoComplete="email"
            className="w-full rounded-xl border border-white/15 bg-[#111113] px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-white/35"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@email.cl"
            required
            type="email"
            value={email}
          />
        </label>

        <button
          className="self-end rounded-xl border border-white/20 bg-[#171719] px-6 py-3 font-bold text-zinc-100 transition hover:border-white/35 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}
          type="submit"
        >
          {loading ? "Consultando…" : "Consultar"}
        </button>
      </form>

      {error ? (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-sm leading-6 text-red-200" role="alert">
          {error}
        </div>
      ) : null}

      {quote ? (
        <article className="space-y-5 rounded-[1.75rem] border border-white/10 bg-[#0a0a0c] p-5 text-zinc-200 sm:p-6">
          <div className="flex flex-col gap-2 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Cotización</p>
              <p className="mt-1 font-mono text-lg font-semibold text-zinc-100">{quote.quoteCode}</p>
            </div>
            <p className="text-sm font-semibold text-zinc-300">
              {quoteStatusLabels[quote.status] ?? "En revisión"}
            </p>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#111113] p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Fecha</dt>
              <dd className="mt-2 text-sm leading-6">{formatPreferredDate(quote.preferredTattooDate)}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#111113] p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Reserva</dt>
              <dd className="mt-2 text-sm leading-6">
                {quote.calendarDateStatus
                  ? (calendarStatusLabels[quote.calendarDateStatus] ?? "En revisión")
                  : "Sin reserva asociada"}
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#111113] p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Abono</dt>
              <dd className="mt-2 text-sm leading-6">
                {quote.deposit?.verified
                  ? `Verificado · $${quote.deposit.amountClp.toLocaleString("es-CL")}`
                  : "Sin abono verificado"}
              </dd>
            </div>
          </dl>

          {quote.publicMessage ? (
            <div className="rounded-2xl border border-white/10 bg-[#111113] p-4 text-sm leading-7 text-zinc-300">
              {quote.publicMessage}
            </div>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}
