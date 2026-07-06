export function QuoteStatusPanel({ initialQuoteCode = "" }: { initialQuoteCode?: string }) {
  const quoteCode = initialQuoteCode.trim().toUpperCase();

  return (
    <section className="mb-6 rounded-3xl border border-amber-100/10 bg-stone-900/70 p-5 text-stone-200">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">
        Mis solicitudes
      </p>
      <h2 className="mt-2 text-2xl font-black text-stone-50">Consulta con código y email</h2>
      <p className="mt-3 text-sm leading-6 text-stone-400">
        Para proteger tu solicitud, usa el código de cotización{quoteCode ? ` ${quoteCode}` : ""} y
        el email que escribiste al enviarla. No necesitas iniciar sesión para consultar el estado
        público.
      </p>
    </section>
  );
}
