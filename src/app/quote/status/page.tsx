import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";
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
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="04"
          eyebrow="Seguimiento privado"
          title="Revisa el estado de tu cotización."
          description="Ingresa el código de cotización y el email usado en la solicitud. La consulta pública muestra solo estado, fecha, reserva, abono verificado y mensajes destinados al cliente."
          tone="black"
          meta={["Código + email", "Datos limitados", "Acceso privado"]}
        />

        <section className="mt-4 border border-[#cec6c2]/14 bg-[#202020] p-4 sm:p-6 lg:p-8">
          <div className="mb-6 border-b border-[#cec6c2]/14 pb-5">
            <p className="neo-kicker">Status / consulta</p>
            <h2 className="neo-display mt-4 text-[clamp(2.5rem,6vw,5rem)] text-[#cec6c2]">
              Tu solicitud
            </h2>
          </div>
          <QuoteStatusPanel initialEmail={email} initialQuoteCode={code} />
        </section>
      </div>
    </main>
  );
}
