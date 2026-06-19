import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  clientQuoteStatusLookupError,
  getClientQuoteStatusByCode,
  isValidQuoteCode,
} from "@/lib/quotes/quote-request";

const quoteStatusLabels: Record<string, string> = {
  pending: "Recibida, pendiente de revisión",
  contacted: "En contacto con el estudio",
  closed: "Cerrada",
  spam: "No procesada",
};

const calendarStatusLabels: Record<string, string> = {
  PENDING_CONFIRMATION: "Fecha solicitada, pendiente de confirmación",
  DEPOSIT_PENDING: "Abono pendiente",
  DEPOSIT_VERIFIED: "Abono verificado",
  CONFIRMED: "Reserva confirmada",
  BLOCKED_BY_ADMIN: "No disponible",
  RELEASED: "Fecha liberada",
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
  const result =
    firestore && hasLookupInput ? await getClientQuoteStatusByCode(firestore, code, email) : null;
  const quote = result?.ok ? result.quote : null;
  const safeError =
    hasLookupInput && (!isValidQuoteCode(code) || result?.ok === false)
      ? clientQuoteStatusLookupError
      : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10">
      <section className="rounded-3xl border border-stone-700 bg-stone-950/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
          Estado de cotización
        </p>
        <h1 className="mt-3 text-4xl font-black text-stone-50">Consulta privada de tu solicitud</h1>
        <p className="mt-3 text-sm leading-6 text-stone-400">
          Ingresa el código de cotización y el email usado en la solicitud para revisar el estado
          general. Esta página no muestra datos personales, notas internas, imágenes ni detalles
          privados del diseño.
        </p>

        <form className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" method="get">
          <label className="block">
            <span className="sr-only">Código de cotización</span>
            <input
              className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 font-mono text-stone-100"
              defaultValue={code}
              name="code"
              placeholder="COT-2026-ABCDE"
              required
            />
          </label>
          <label className="block">
            <span className="sr-only">Email de la solicitud</span>
            <input
              className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
              defaultValue={email}
              name="email"
              placeholder="tu@email.cl"
              required
              type="email"
            />
          </label>
          <button
            className="rounded-full bg-amber-300 px-6 py-3 font-semibold text-stone-950"
            type="submit"
          >
            Consultar
          </button>
        </form>

        {safeError ? <p className="mt-4 text-sm text-red-300">{safeError}</p> : null}
        {code && !email ? (
          <p className="mt-4 text-sm text-stone-300">
            Para proteger tu cotización, confirma el email usado al enviar la solicitud.
          </p>
        ) : null}
        {!firestore ? (
          <p className="mt-4 text-sm text-red-300">
            El sistema de consulta no está disponible temporalmente.
          </p>
        ) : null}

        {quote ? (
          <article className="mt-6 space-y-4 rounded-2xl border border-stone-800 bg-stone-900/70 p-5 text-stone-200">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Código
              </p>
              <p className="mt-1 font-mono text-lg text-amber-200">{quote.quoteCode}</p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Fecha solicitada
                </dt>
                <dd className="mt-1">{formatPreferredDate(quote.preferredTattooDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Estado
                </dt>
                <dd className="mt-1">{quoteStatusLabels[quote.status] ?? "En revisión"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Reserva
                </dt>
                <dd className="mt-1">
                  {quote.calendarDateStatus
                    ? (calendarStatusLabels[quote.calendarDateStatus] ?? "En revisión")
                    : "Sin reserva asociada"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Abono
                </dt>
                <dd className="mt-1">
                  {quote.deposit?.verified
                    ? `Verificado por $${quote.deposit.amountClp.toLocaleString("es-CL")}`
                    : "Sin abono verificado publicado"}
                </dd>
              </div>
            </dl>
            {quote.publicMessage ? (
              <p className="rounded-xl border border-stone-700 bg-stone-950/70 p-3 text-sm leading-6">
                {quote.publicMessage}
              </p>
            ) : null}
            <p className="text-sm leading-6 text-stone-400">
              La fecha queda confirmada solo cuando el estudio lo informa explícitamente y la
              reserva aparece como confirmada. Si necesitas corregir datos, responde por el canal de
              contacto que indicaste en la cotización.
            </p>
          </article>
        ) : null}
      </section>
    </main>
  );
}
