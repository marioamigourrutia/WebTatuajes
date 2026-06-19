import type { Metadata } from "next";
import { PortfolioGallery } from "@/lib/portfolio/portfolio-gallery";
import {
  combinePortfolioItems,
  getPublishedPortfolioItems,
  toPublicPortfolioItems,
} from "@/lib/portfolio/portfolio";
import { listPublicBackendPortfolioItems } from "@/lib/portfolio/public-portfolio-backend";

export const metadata: Metadata = {
  title: "Portafolio",
  description:
    "Galería pública de estilos y trabajos de referencia para cotizar tatuajes personalizados.",
};

export const dynamic = "force-dynamic";

async function getPublicPortfolioItems() {
  try {
    const firestoreItems = await listPublicBackendPortfolioItems();

    return toPublicPortfolioItems(
      combinePortfolioItems(getPublishedPortfolioItems(), firestoreItems),
    );
  } catch {
    return toPublicPortfolioItems(getPublishedPortfolioItems());
  }
}

export default async function PortfolioPage() {
  const items = await getPublicPortfolioItems();

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
          Galería en actualización con referencias de estilo, zonas del cuerpo y etiquetas para
          ayudarte a preparar una cotización clara.
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
