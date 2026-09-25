import type { Metadata } from "next";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { instagramMediaToPortfolioItems } from "@/lib/instagram/portfolio-adapter";
import { listPublicInstagramMedia } from "@/lib/instagram/instagram-media";
import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";
import { PortfolioGallery } from "@/lib/portfolio/portfolio-gallery";
import {
  getPortfolioItemsWithStaticFallback,
  getPublishedPortfolioItems,
  toPublicPortfolioItems,
} from "@/lib/portfolio/portfolio";
import {
  canUsePublicBackend,
  listPublicBackendPortfolioItems,
} from "@/lib/portfolio/public-portfolio-backend";

export const metadata: Metadata = {
  title: "Portafolio",
  description:
    "Galería pública de estilos y trabajos de referencia para cotizar tatuajes personalizados.",
};

export const dynamic = "force-dynamic";

async function getPublicPortfolioItems() {
  try {
    if (!(await canUsePublicBackend())) {
      return toPublicPortfolioItems(getPublishedPortfolioItems());
    }

    const firestore = getFirebaseAdminFirestore();
    const instagramItems = firestore
      ? instagramMediaToPortfolioItems(await listPublicInstagramMedia(firestore))
      : [];
    const firestoreItems = await listPublicBackendPortfolioItems();

    return toPublicPortfolioItems(
      getPortfolioItemsWithStaticFallback([...instagramItems, ...firestoreItems]),
    );
  } catch {
    return toPublicPortfolioItems(getPublishedPortfolioItems());
  }
}

export default async function PortfolioPage() {
  const items = await getPublicPortfolioItems();

  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="03"
          eyebrow="Portfolio / selección"
          title="Piezas, referencias y lenguaje visual."
          description="Explora trabajos, referencias de estilo y composiciones que pueden ayudarte a aterrizar tu próxima idea antes de cotizar."
          tone="paper"
          meta={[`${items.length} piezas`, "Black & grey", "Selección pública"]}
        >
          <a className="neo-button-dark" href="/quote">
            Solicitar cotización →
          </a>
        </EditorialPageHero>

        <section className="mt-4 border-t border-[#cec6c2]/14 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3 py-4 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#837f7c]">
            <span>Work selection / Mario Amigo Tattoo</span>
            <span>Filtra por estilo o etiqueta</span>
          </div>
          <PortfolioGallery items={items} />
        </section>
      </div>
    </main>
  );
}
