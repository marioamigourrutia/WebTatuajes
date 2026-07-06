import type { Metadata } from "next";
import { formatClpPrice, productStatusLabels } from "@/lib/shop/catalog";
import { getPublicShopProductsWithFirestoreFallback } from "@/lib/shop/catalog-server";
import { PurchaseRequestForm } from "@/lib/shop/purchase-request-form";

export const metadata: Metadata = {
  title: "Obras disponibles",
  description:
    "Revisa obras disponibles del estudio y envía una solicitud de compra para coordinar por WhatsApp, sin pagos en línea.",
};

export default async function ShopPage() {
  const { products, source } = await getPublicShopProductsWithFirestoreFallback();
  const isFallbackCatalog = source === "fallback";
  const hasFirestoreProducts = source === "firestore" && products.length > 0;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 sm:px-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-amber-100/10 bg-stone-950/55 p-6 shadow-2xl shadow-black/25 sm:p-8">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-amber-300/10 blur-3xl" />
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
          Tienda · obras originales
        </p>
        <h1 className="mt-3 text-5xl font-black leading-tight text-stone-50 sm:text-6xl">
          Obras disponibles
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-stone-300">
          Piezas y flashes disponibles para solicitar. La compra se coordina por contacto directo:
          no hay pagos automáticos ni reservas sin confirmación del estudio.
        </p>
      </section>

      {isFallbackCatalog ? (
        <section className="rounded-[2rem] border border-amber-300/30 bg-amber-950/30 p-5 text-sm leading-6 text-amber-50">
          <p className="font-bold uppercase tracking-[0.2em] text-amber-200">
            Catálogo temporal en modo referencia
          </p>
          <p className="mt-2">
            En este momento no pudimos confirmar disponibilidad desde el sistema de obras. Las
            piezas mostradas son referenciales y no se pueden solicitar desde el formulario. Para
            consultar disponibilidad real, coordina directamente por WhatsApp o desde contacto.
          </p>
        </section>
      ) : null}

      <section aria-label="Catálogo de obras" className="grid gap-4 md:grid-cols-3">
        {products.length === 0 ? (
          <p className="rounded-3xl border border-stone-800 bg-stone-950/70 p-6 text-sm leading-6 text-stone-300 md:col-span-3">
            No hay obras disponibles publicadas por el momento. Puedes escribir por contacto para
            consultar próximas piezas o coordinar un diseño personalizado.
          </p>
        ) : null}
        {products.map((product) => (
          <article
            className="group flex flex-col overflow-hidden rounded-3xl border border-stone-800 bg-stone-950/70 shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-amber-300/40"
            key={product.id}
          >
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={product.title}
                className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
                src={product.imageUrl}
              />
            ) : (
              <div className="flex h-48 items-center justify-center bg-[radial-gradient(circle_at_top,#78350f,#0c0a09_60%)] text-sm font-semibold uppercase tracking-[0.25em] text-amber-100/80 transition duration-500 group-hover:scale-105">
                Sin imagen
              </div>
            )}
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
                  {product.code}
                </p>
                <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
                  {productStatusLabels[product.status]}
                </span>
              </div>
              <h2 className="text-xl font-black text-stone-50">{product.title}</h2>
              <p className="text-sm leading-6 text-stone-300">{product.description}</p>
              <p className="mt-auto text-lg font-black text-amber-200">
                {formatClpPrice(product.priceClp)}
              </p>
              {isFallbackCatalog ? (
                <a
                  className="rounded-full border border-amber-300/50 px-4 py-2 text-center text-sm font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950"
                  href="/contacto"
                >
                  Coordinar por contacto
                </a>
              ) : (
                <a
                  className="rounded-full border border-amber-300/50 px-4 py-2 text-center text-sm font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950 aria-disabled:pointer-events-none aria-disabled:opacity-50"
                  aria-disabled={product.status !== "available"}
                  href="#solicitar-compra"
                >
                  {product.status === "available" ? "Solicitar compra" : "No disponible"}
                </a>
              )}
            </div>
          </article>
        ))}
      </section>

      {hasFirestoreProducts ? (
        <section id="solicitar-compra">
          <PurchaseRequestForm products={products} />
        </section>
      ) : null}
    </main>
  );
}
