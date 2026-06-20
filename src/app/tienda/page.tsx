import type { Metadata } from "next";
import { formatClpPrice, getPublicShopProducts, productStatusLabels } from "@/lib/shop/catalog";
import { PurchaseRequestForm } from "@/lib/shop/purchase-request-form";

export const metadata: Metadata = {
  title: "Obras disponibles",
  description:
    "Revisa obras disponibles del estudio y envía una solicitud de compra para coordinar por WhatsApp, sin pagos en línea.",
};

export default function ShopPage() {
  const products = getPublicShopProducts();

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 sm:px-10">
      <section className="rounded-3xl border border-stone-700 bg-stone-950/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Tienda</p>
        <h1 className="mt-3 text-4xl font-black text-stone-50">Obras disponibles</h1>
        <p className="mt-3 max-w-2xl leading-7 text-stone-300">
          Piezas y flashes disponibles para solicitar. La compra se coordina por contacto directo:
          no hay pagos automáticos ni reservas sin confirmación del estudio.
        </p>
      </section>

      <section aria-label="Catálogo de obras" className="grid gap-4 md:grid-cols-3">
        {products.map((product) => (
          <article
            className="flex flex-col overflow-hidden rounded-3xl border border-stone-800 bg-stone-950/70"
            key={product.id}
          >
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={product.title}
                className="h-48 w-full object-cover"
                src={product.imageUrl}
              />
            ) : (
              <div className="flex h-48 items-center justify-center bg-[radial-gradient(circle_at_top,#78350f,#0c0a09_60%)] text-sm font-semibold uppercase tracking-[0.25em] text-amber-100/80">
                Sin imagen
              </div>
            )}
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
                  {product.code}
                </p>
                <span className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-200">
                  {productStatusLabels[product.status]}
                </span>
              </div>
              <h2 className="text-xl font-black text-stone-50">{product.title}</h2>
              <p className="text-sm leading-6 text-stone-300">{product.description}</p>
              <p className="mt-auto text-lg font-black text-amber-200">
                {formatClpPrice(product.priceClp)}
              </p>
              <a
                className="rounded-full border border-amber-300/50 px-4 py-2 text-center text-sm font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950 aria-disabled:pointer-events-none aria-disabled:opacity-50"
                aria-disabled={product.status !== "available"}
                href="#solicitar-compra"
              >
                {product.status === "available" ? "Solicitar compra" : "No disponible"}
              </a>
            </div>
          </article>
        ))}
      </section>

      <section id="solicitar-compra">
        <PurchaseRequestForm products={products} />
      </section>
    </main>
  );
}
