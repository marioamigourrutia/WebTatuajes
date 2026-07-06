import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solicitud de datos",
  description: "Proceso para pedir acceso, corrección, eliminación o anonimización de datos.",
};

export default function DataRequestPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-10">
      <section className="rounded-[2rem] border border-amber-100/10 bg-stone-950/70 p-6 text-stone-300 shadow-2xl shadow-black/25 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Datos personales</p>
        <h1 className="mt-3 text-4xl font-black text-stone-50">Solicitud de eliminación o anonimización</h1>
        <div className="mt-6 space-y-5 leading-7">
          <p>Para pedir acceso, corrección, eliminación o anonimización, escribe al estudio por WhatsApp o por el canal oficial e incluye el email usado, código de cotización o compra si lo tienes, y el tipo de solicitud.</p>
          <p>El estudio validará tu identidad antes de modificar información. Algunos registros operativos pueden conservarse anonimizados para trazabilidad, seguridad o cumplimiento legal.</p>
          <p>Si tu solicitud involucra imágenes, indica cuáles deben eliminarse o reemplazarse para evitar borrar material equivocado.</p>
        </div>
      </section>
    </main>
  );
}
