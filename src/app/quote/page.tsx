import type { Metadata } from "next";
import { isExternalImageUploadConfigured } from "@/lib/images/upload-config";
import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";
import { QuoteRequestForm } from "@/lib/quotes/quote-request-form";

export const metadata: Metadata = {
  title: "Cotización",
  description:
    "Solicita una cotización privada para tu tatuaje con idea, zona, tamaño, presupuesto y referencias.",
};

export default function QuotePage() {
  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="02"
          eyebrow="Cotización privada"
          title="Cuéntame tu idea con contexto."
          description="Mientras más clara sea la información sobre la zona, el tamaño, el estilo y el presupuesto estimado, mejor podremos evaluar la viabilidad del proyecto y definir los próximos pasos. Al finalizar recibirás tu código de cotización y podrás continuar por el canal que elijas."
          meta={["Privado", "Sin compromiso", "Revisión personalizada"]}
        >
          <div className="flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#837f7c]">
            <span>Idea</span>
            <span>→</span>
            <span>Evaluación</span>
            <span>→</span>
            <span>Agenda</span>
          </div>
        </EditorialPageHero>

        <section className="mt-4 border border-[#cec6c2]/14 bg-[#181818] p-4 sm:p-6 lg:p-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-[#cec6c2]/14 pb-5">
            <div>
              <p className="neo-kicker">Tu proyecto</p>
              <h2 className="neo-display mt-4 text-[clamp(2.6rem,7vw,5.5rem)] text-[#cec6c2]">
                Datos para cotizar
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[#837f7c]">
              Completa información real y suficiente para evaluar tu idea. Los datos se validan nuevamente en el servidor antes de guardar la solicitud.
            </p>
          </div>
          <QuoteRequestForm fileUploadsEnabled={isExternalImageUploadConfigured()} />
        </section>
      </div>
    </main>
  );
}
