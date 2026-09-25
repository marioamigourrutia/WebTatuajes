import type { Metadata } from "next";
import { isExternalImageUploadConfigured } from "@/lib/images/upload-provider";
import { QuoteRequestForm } from "@/lib/quotes/quote-request-form";

export const metadata: Metadata = {
  title: "Cotización",
  description:
    "Solicita una cotización privada para tu tatuaje con idea, zona, tamaño, presupuesto y referencias.",
};

export default function QuotePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden border border-[#cec6c2]/20 bg-[#1b1b1b] p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute right-4 top-[-1.5rem] text-[7rem] font-black leading-none text-transparent [-webkit-text-stroke:1px_rgba(206,198,194,0.10)] sm:text-[9rem]">
          02
        </div>
        <div className="relative max-w-3xl">
          <p className="neo-kicker">Cotización privada</p>
          <h1 className="neo-display mt-5 max-w-[12ch] text-[clamp(3.1rem,8vw,6.2rem)] leading-[0.92] text-[#cec6c2]">
            Cuéntame tu idea con contexto.
          </h1>
          <div className="neo-rule mt-6" />
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#b7aaa4]">
            Mientras más clara sea la zona, tamaño, estilo y presupuesto estimado, mejor podremos evaluar viabilidad y próximos pasos. Al finalizar tendrás tu código de cotización y podrás continuar por WhatsApp.
          </p>
        </div>
      </section>
      <QuoteRequestForm fileUploadsEnabled={isExternalImageUploadConfigured()} />
    </main>
  );
}
