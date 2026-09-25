import type { Metadata } from "next";
import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";
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
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="10"
          eyebrow="Tienda / obras originales"
          title="Obras disponibles."
          description="Piezas y flashes disponibles para solicitar. La compra se coordina por contacto directo: no hay pagos automáticos ni reservas sin confirmación del estudio."
          tone="paper"
          meta={[`${products.length} piezas`, "Sin pago online", "Coordinación directa"]}
        />

        {isFallbackCatalog ? (
          <section className="mt-4 border border-[#cec6c2]/20 bg-[#370803] p-5 text-sm leading-7 text-[#b7aaa4] sm:p-6">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#cec6c2]">
              Catálogo temporal / referencia
            </p>
            <p className="mt-3 max-w-4xl">
              En este momento no pudimos confirmar disponibilidad desde el sistema de obras. Las piezas mostradas son referenciales y no se pueden solicitar desde el formulario. Consulta disponibilidad real por contacto.
            </p>
          </section>
        ) : null}

        <section aria-label="Catálogo de obras" className="mt-4 grid border border-[#cec6c2]/14 md:grid-cols-2 xl:grid-cols-3">
          {products.length === 0 ? (
            <div className="col-span-full min-h-64 p-6 sm:p-8">
              <p className="neo-kicker">Catálogo</p>
              <p className="mt-14 max-w-2xl text-lg leading-8 text-[#837f7c]">
                No hay obras disponibles publicadas por el momento. Puedes escribir por contacto para consultar próximas piezas o coordinar un diseño personalizado.
              </p>
            </div>
          ) : null}

          {products.map((product, index) => (
            <article className="group border-b border-[#cec6c2]/14 md:border-r xl:[&:nth-child(3n)]:border-r-0" key={product.id}>
              <div className="relative h-72 overflow-hidden border-b border-[#cec6c2]/14 bg-[#202020]">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={product.title}
                    className="h-full w-full object-cover grayscale-[0.08] transition duration-500 group-hover:scale-[1.025]"
                    src={product.imageUrl}
                  />
                ) : (
                  <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_center,rgba(183,170,164,0.14),transparent_34%),linear-gradient(135deg,#2c2c2c,#141414)]">
                    <span className="neo-display text-5xl text-[#cec6c2]/25">No image</span>
                  </div>
                )}
                <span className="absolute left-4 top-4 bg-[#141414] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#cec6c2]">
                  {product.code}
                </span>
                <span className="absolute right-4 top-4 bg-[#cec6c2] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#141414]">
                  {productStatusLabels[product.status]}
                </span>
              </div>

              <div className="flex min-h-64 flex-col p-5">
                <span className="neo-index">OBJ/{String(index + 1).padStart(2, "0")}</span>
                <h2 className="neo-display mt-5 text-3xl text-[#cec6c2]">{product.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#837f7c]">{product.description}</p>
                <div className="mt-auto flex items-end justify-between gap-4 pt-7">
                  <p className="text-base font-bold text-[#cec6c2]">{formatClpPrice(product.priceClp)}</p>
                  {isFallbackCatalog ? (
                    <a className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#b7aaa4] hover:text-[#cec6c2]" href="/contacto">
                      Contacto →
                    </a>
                  ) : (
                    <a
                      className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#b7aaa4] hover:text-[#cec6c2] aria-disabled:pointer-events-none aria-disabled:opacity-40"
                      aria-disabled={product.status !== "available"}
                      href="#solicitar-compra"
                    >
                      {product.status === "available" ? "Solicitar →" : "No disponible"}
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>

        {hasFirestoreProducts ? (
          <section className="mt-4 border border-[#cec6c2]/14 bg-[#202020] p-5 sm:p-7 lg:p-9" id="solicitar-compra">
            <div className="mb-7 border-b border-[#cec6c2]/14 pb-5">
              <p className="neo-kicker">Purchase request</p>
              <h2 className="neo-display mt-4 text-[clamp(2.7rem,7vw,5.5rem)] text-[#cec6c2]">Solicitar una obra</h2>
            </div>
            <PurchaseRequestForm products={products} />
          </section>
        ) : null}
      </div>
    </main>
  );
}
