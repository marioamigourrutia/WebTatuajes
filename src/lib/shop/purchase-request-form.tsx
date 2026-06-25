"use client";

import { useState } from "react";
import { formatClpPrice, productStatusLabels, type ShopProduct } from "./catalog";

type PurchaseRequestResponse = {
  id?: string;
  purchaseCode?: string;
  whatsappUrl?: string | null;
  errors?: Record<string, string>;
};

export function PurchaseRequestForm({ products }: { products: readonly ShopProduct[] }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitPurchaseRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setNotice(null);
    setWhatsappUrl(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const body = (await response.json()) as PurchaseRequestResponse;

      if (!response.ok) {
        setErrors(body.errors ?? { form: "No se pudo guardar la solicitud." });
        return;
      }

      setNotice(
        `Solicitud ${body.purchaseCode} guardada. Abre WhatsApp para enviar el mensaje preparado al estudio.`,
      );
      setWhatsappUrl(body.whatsappUrl ?? null);
      form.reset();
    } catch {
      setErrors({ form: "No se pudo conectar con el servidor. Intenta nuevamente." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="grid gap-5 rounded-[2rem] border border-amber-100/10 bg-stone-950/75 p-6 shadow-2xl shadow-black/25 sm:p-8"
      onSubmit={submitPurchaseRequest}
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
          Solicitar compra
        </p>
        <h2 className="mt-3 text-3xl font-black text-stone-50">
          Consulta por una obra disponible.
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-300">
          Este formulario no confirma pago ni reserva. Guarda tu solicitud y prepara un mensaje de
          WhatsApp para coordinar directamente con el estudio.
        </p>
      </div>

      {errors.form ? (
        <p className="rounded-2xl border border-red-400/50 bg-red-950/40 p-3 text-sm text-red-100">
          {errors.form}
        </p>
      ) : null}
      {notice ? (
        <div className="space-y-3 rounded-2xl border border-emerald-400/50 bg-emerald-950/40 p-3 text-sm text-emerald-100">
          <p>{notice}</p>
          {whatsappUrl ? (
            <a
              className="inline-flex rounded-full bg-emerald-300 px-4 py-2 font-semibold text-emerald-950 transition hover:bg-emerald-200"
              href={whatsappUrl}
              rel="noreferrer"
              target="_blank"
            >
              Abrir WhatsApp con mensaje preparado
            </a>
          ) : null}
        </div>
      ) : null}

      <label className="grid gap-2 text-sm font-semibold text-stone-100">
        Obra
        <select
          className="rounded-2xl border border-stone-700 bg-stone-900/90 px-4 py-3 text-stone-100 transition focus:border-amber-300"
          name="productId"
          required
        >
          <option value="">Selecciona una obra</option>
          {products.map((product) => (
            <option disabled={product.status !== "available"} key={product.id} value={product.id}>
              {product.title} · {product.code} · {formatClpPrice(product.priceClp)} ·{" "}
              {productStatusLabels[product.status]}
            </option>
          ))}
        </select>
        {errors.productId ? <span className="text-xs text-red-200">{errors.productId}</span> : null}
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-stone-100">
          Nombre
          <input
            className="rounded-2xl border border-stone-700 bg-stone-900/90 px-4 py-3 text-stone-100 transition focus:border-amber-300"
            name="customerName"
            required
          />
          {errors.customerName ? (
            <span className="text-xs text-red-200">{errors.customerName}</span>
          ) : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold text-stone-100">
          Teléfono
          <input
            className="rounded-2xl border border-stone-700 bg-stone-900/90 px-4 py-3 text-stone-100 transition focus:border-amber-300"
            name="phone"
            required
          />
          {errors.phone ? <span className="text-xs text-red-200">{errors.phone}</span> : null}
        </label>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-stone-100">
        Email opcional
        <input
          className="rounded-2xl border border-stone-700 bg-stone-900/90 px-4 py-3 text-stone-100 transition focus:border-amber-300"
          name="email"
          type="email"
        />
        {errors.email ? <span className="text-xs text-red-200">{errors.email}</span> : null}
      </label>

      <label className="flex gap-3 rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-sm text-stone-200">
        <input className="mt-1" name="contactConsent" required type="checkbox" />
        <span>Acepto que el estudio me contacte por esta solicitud de compra.</span>
      </label>
      {errors.contactConsent ? (
        <span className="text-xs text-red-200">{errors.contactConsent}</span>
      ) : null}

      <button
        className="rounded-full bg-amber-300 px-6 py-3 font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Guardando solicitud..." : "Guardar y preparar WhatsApp"}
      </button>
    </form>
  );
}
