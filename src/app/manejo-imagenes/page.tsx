import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manejo de imágenes",
  description: "Criterios de recepción, almacenamiento y uso de imágenes de referencia.",
};

export default function ImageHandlingPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-10">
      <section className="rounded-[2rem] border border-amber-100/10 bg-stone-950/70 p-6 text-stone-300 shadow-2xl shadow-black/25 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Imágenes</p>
        <h1 className="mt-3 text-4xl font-black text-stone-50">Manejo de imágenes</h1>
        <div className="mt-6 space-y-5 leading-7">
          <p>Envía imágenes solo si aportan contexto al diseño. Prefiere referencias de estilo, composición o inspiración sin datos personales.</p>
          <p>Las fotos corporales sensibles deben compartirse únicamente por el canal privado acordado con el estudio, salvo que el sitio indique almacenamiento privado habilitado.</p>
          <p>Las imágenes se usan para evaluar la cotización y coordinar el trabajo. Puedes solicitar eliminación o anonimización mediante la página de solicitud de datos.</p>
        </div>
      </section>
    </main>
  );
}
