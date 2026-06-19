import type { Metadata } from "next";
import { QuoteRequestForm } from "@/lib/quotes/quote-request-form";

export const metadata: Metadata = {
  title: "Cotización",
  description:
    "Solicita una cotización privada para tu tatuaje con idea, zona, tamaño, presupuesto y referencias.",
};

export default function QuotePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <section className="rounded-3xl border border-stone-700 bg-stone-950/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
          Cotización
        </p>
        <h1 className="mt-3 text-4xl font-black text-stone-50">Cuéntanos tu idea con contexto.</h1>
        <p className="mt-3 max-w-2xl leading-7 text-stone-300">
          Mientras más clara sea la zona, tamaño, estilo y presupuesto estimado, mejor podremos
          evaluar viabilidad y próximos pasos. No necesitas iniciar sesión para enviar la solicitud.
        </p>
      </section>
      <QuoteRequestForm />
    </main>
  );
}
