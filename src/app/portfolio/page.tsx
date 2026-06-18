import type { Metadata } from "next";
import { PortfolioGallery } from "@/lib/portfolio/portfolio-gallery";
import { getPublishedPortfolioItems } from "@/lib/portfolio/portfolio";

export const metadata: Metadata = {
  title: "Portafolio — WebTatuajes",
  description:
    "Galería pública de estilos y trabajos de referencia para cotizar tatuajes personalizados.",
};

export default function PortfolioPage() {
  const items = getPublishedPortfolioItems();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <section className="space-y-5 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-300">
          Portafolio
        </p>
        <h1 className="max-w-4xl text-5xl font-black leading-tight text-stone-50 sm:text-7xl">
          Referencias de estilo para imaginar tu próxima pieza.
        </h1>
        <p className="max-w-3xl text-lg leading-8 text-stone-300">
          Esta galería usa placeholders visuales mientras el estudio carga imágenes reales. El foco
          del MVP es mostrar estilos, zonas del cuerpo, etiquetas y una ruta clara hacia la
          cotización.
        </p>
        <a
          className="inline-flex rounded-full bg-amber-300 px-6 py-3 font-semibold text-stone-950 transition hover:bg-amber-200"
          href="/quote"
        >
          Solicitar cotización
        </a>
      </section>

      <PortfolioGallery items={items} />
    </main>
  );
}
