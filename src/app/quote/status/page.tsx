import { QuoteStatusPanel } from "@/lib/quotes/quote-status-panel";

export default async function QuoteStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; email?: string }>;
}) {
  const params = await searchParams;
  const code = (params.code ?? "").trim().toUpperCase();
  const email = (params.email ?? "").trim().toLowerCase();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-10 sm:py-14">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#08080a] p-6 shadow-2xl shadow-black/35 sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/[0.035] blur-3xl" />

        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-500">
            Seguimiento privado
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">
            Revisa el estado de tu cotización.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
            Ingresa el código de cotización y el email usado en la solicitud. Por privacidad, la
            consulta pública muestra solo estado, fecha, reserva, abono verificado y mensajes
            destinados al cliente.
          </p>

          <div className="mt-8">
            <QuoteStatusPanel initialEmail={email} initialQuoteCode={code} />
          </div>
        </div>
      </section>
    </main>
  );
}
