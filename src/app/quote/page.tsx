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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 sm:px-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-amber-100/10 bg-stone-950/55 p-6 shadow-2xl shadow-black/25 sm:p-8">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-amber-300/10 blur-3xl" />
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
          Cotización · HuespedTattooStudio
        </p>
        <h1 className="mt-3 text-5xl font-black leading-tight text-stone-50 sm:text-6xl">
          Cuéntanos tu idea con contexto.
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-stone-300">
          Mientras más clara sea la zona, tamaño, estilo y presupuesto estimado, mejor podremos
          evaluar viabilidad y próximos pasos. Crearemos tu cotización y abriremos WhatsApp para
          que puedas enviar fotos o referencias directamente al estudio.
        </p>
      </section>
      <QuoteRequestForm fileUploadsEnabled={isExternalImageUploadConfigured()} />
    </main>
  );
}
