import type { Metadata } from "next";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { instagramMediaToPortfolioItems } from "@/lib/instagram/portfolio-adapter";
import { listPublicInstagramMedia } from "@/lib/instagram/instagram-media";
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
    <main className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden border border-[#cfff19]/20 bg-[#070707] p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute right-4 top-[-2rem] text-[8rem] font-black leading-none text-transparent [-webkit-text-stroke:1px_rgba(207,255,25,0.12)] sm:text-[11rem]">03</div>
        <div className="relative max-w-4xl">
          <p className="neo-kicker">Portfolio / selección</p>
          <h1 className="neo-display mt-5 text-[clamp(4rem,10vw,8.5rem)] leading-[0.84] text-white">
            Piezas, referencias y lenguaje visual.
          </h1>
          <div className="neo-rule mt-6" />
          <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-400">
            Explora trabajos, referencias de estilo y composiciones que pueden ayudarte a aterrizar tu próxima idea antes de cotizar.
          </p>
          <a className="neo-button mt-7" href="/quote">
            Solicitar cotización ↗
          </a>
        </div>
      </section>

      <PortfolioGallery items={items} />
    </main>
  );
}
