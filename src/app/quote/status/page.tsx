import { headers } from "next/headers";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  clientQuoteStatusLookupError,
  getClientQuoteStatusByCode,
  isValidQuoteCode,
} from "@/lib/quotes/quote-request";
import { QuoteStatusPanel } from "@/lib/quotes/quote-status-panel";
import { checkRateLimit, getRateLimitOptions } from "@/lib/rate-limit";

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

function formatPreferredDate(value: string | null) {
  if (!value) return "Sin fecha solicitada";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "full",
    timeZone: "America/Santiago",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

export default async function QuoteStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; email?: string }>;
}) {
  const params = await searchParams;
  const code = (params.code ?? "").trim().toUpperCase();
  const email = (params.email ?? "").trim().toLowerCase();
  const firestore = getFirebaseAdminFirestore();
  const hasLookupInput = Boolean(code && email);
  const requestHeaders = hasLookupInput ? await headers() : null;
  const forwardedFor = requestHeaders?.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = requestHeaders?.get("x-real-ip")?.trim();
  const rateLimit = hasLookupInput
    ? checkRateLimit(
        `quotes-status:${forwardedFor || realIp || "unknown"}`,
        getRateLimitOptions("quotes-status"),
      )
    : { ok: true as const };
  const result =
    firestore && hasLookupInput && rateLimit.ok
      ? await getClientQuoteStatusByCode(firestore, code, email)
      : null;
  const quote = result?.ok ? result.quote : null;
  const safeError =
    hasLookupInput && !rateLimit.ok
      ? rateLimit.message
      : hasLookupInput && (!isValidQuoteCode(code) || result?.ok === false)
        ? clientQuoteStatusLookupError
        : null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/60 p-6 shadow-2xl shadow-black/40 sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/[0.06] blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">
          Seguimiento privado
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">
          Revisa el estado de tu cotización.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
          Ingresa el código de cotización y el email usado en la solicitud. Por privacidad no mostramos
          notas internas, referencias, imágenes ni datos personales adicionales.
        </p>

        <div className="mt-7">
          <QuoteStatusPanel initialQuoteCode={code} />
        </div>

        <form className="mt-7 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" method="get">
          <label className="block">
            <span className="sr-only">Código de cotización</span>
            <input
              autoComplete="off"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950/90 px-4 py-3 font-mono uppercase text-zinc-100 transition placeholder:text-zinc-700 focus:border-zinc-400 focus:outline-none"
              defaultValue={code}
              name="code"
              placeholder="COT-2026-XXXXXXXXXX"
              required
            />
          </label>
          <label className="block">
            <span className="sr-only">Email de la solicitud</span>
            <input
              autoComplete="email"
              className="w-full rounded-2xl border border-white/10 bg-zinc-950/90 px-4 py-3 text-zinc-100 transition placeholder:text-zinc-700 focus:border-zinc-400 focus:outline-none"
              defaultValue={email}
              name="email"
              placeholder="tu@email.cl"
              required
              type="email"
            />
          </label>
          <button
            className="rounded-full bg-zinc-100 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-white"
            type="submit"
          >
            Consultar
          </button>
        </form>

        {safeError ? <p className="mt-4 text-sm text-red-300">{safeError}</p> : null}
        {code && !email ? (
          <p className="mt-4 text-sm text-zinc-300">
            Para proteger tu cotización, confirma el email usado al enviar la solicitud.
          </p>
        ) : null}
        {!firestore ? (
          <p className="mt-4 text-sm text-red-300">
            El sistema de consulta no está disponible temporalmente.
          </p>
        ) : null}

        {quote ? (
          <article className="mt-7 space-y-5 rounded-3xl border border-white/10 bg-zinc-950/80 p-5 text-zinc-200 shadow-xl shadow-black/25 sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Código</p>
              <p className="mt-1 font-mono text-lg text-zinc-100">{quote.quoteCode}</p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Fecha solicitada
                </dt>
                <dd className="mt-2">{formatPreferredDate(quote.preferredTattooDate)}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Estado</dt>
                <dd className="mt-2">{quoteStatusLabels[quote.status] ?? "En revisión"}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Reserva</dt>
                <dd className="mt-2">
                  {quote.calendarDateStatus
                    ? (calendarStatusLabels[quote.calendarDateStatus] ?? "En revisión")
                    : "Sin reserva asociada"}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Abono</dt>
                <dd className="mt-2">
                  {quote.deposit?.verified
                    ? `Verificado por $${quote.deposit.amountClp.toLocaleString("es-CL")}`
                    : "Sin abono verificado publicado"}
                </dd>
              </div>
            </dl>
            {quote.publicMessage ? (
              <p className="rounded-2xl border border-white/10 bg-black/50 p-4 text-sm leading-6">
                {quote.publicMessage}
              </p>
            ) : null}
            <p className="text-sm leading-6 text-zinc-500">
              Una fecha queda confirmada únicamente cuando el estudio lo informa explícitamente. Si
              necesitas corregir datos, utiliza el canal de contacto indicado en tu solicitud.
            </p>
          </article>
        ) : null}
      </section>
    </main>
  );
}
