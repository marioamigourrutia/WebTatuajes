"use client";

import { useState, type FormEvent } from "react";

type QuoteFormErrors = Record<string, string>;

const fieldClass =
  "mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100";
const labelClass = "text-xs font-semibold uppercase tracking-[0.2em] text-stone-400";

export function QuoteRequestForm() {
  const [errors, setErrors] = useState<QuoteFormErrors>({});
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    setErrors({});
    setCreatedId(null);

    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { id?: string; errors?: QuoteFormErrors };

      if (!response.ok) {
        setErrors(result.errors ?? { form: "No se pudo enviar la solicitud." });
        return;
      }

      form.reset();
      setCreatedId(result.id ?? "creada");
    } catch {
      setErrors({ form: "No se pudo conectar con el servidor local." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-5 rounded-3xl border border-stone-700 bg-stone-950/70 p-6"
      onSubmit={handleSubmit}
    >
      <div>
        <h1 className="text-3xl font-black text-stone-50">Solicitar cotización</h1>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          Contanos tu idea y la guardamos en Firestore desde una ruta server-side. No necesitás
          iniciar sesión.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Nombre</span>
          <input className={fieldClass} name="customerName" required />
          {errors.customerName ? (
            <span className="text-sm text-red-300">{errors.customerName}</span>
          ) : null}
        </label>
        <label className="block">
          <span className={labelClass}>Email</span>
          <input className={fieldClass} name="email" required type="email" />
          {errors.email ? <span className="text-sm text-red-300">{errors.email}</span> : null}
        </label>
        <label className="block">
          <span className={labelClass}>Teléfono opcional</span>
          <input className={fieldClass} name="phone" type="tel" />
          {errors.phone ? <span className="text-sm text-red-300">{errors.phone}</span> : null}
        </label>
        <label className="block">
          <span className={labelClass}>Contacto preferido</span>
          <select className={fieldClass} defaultValue="email" name="preferredContactMethod">
            <option value="email">Email</option>
            <option value="phone">Teléfono</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          {errors.preferredContactMethod ? (
            <span className="text-sm text-red-300">{errors.preferredContactMethod}</span>
          ) : null}
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Idea / descripción</span>
        <textarea className={fieldClass} name="description" required rows={5} />
        {errors.description ? (
          <span className="text-sm text-red-300">{errors.description}</span>
        ) : null}
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className={labelClass}>Zona del cuerpo</span>
          <input className={fieldClass} name="bodyPlacement" required />
          {errors.bodyPlacement ? (
            <span className="text-sm text-red-300">{errors.bodyPlacement}</span>
          ) : null}
        </label>
        <label className="block">
          <span className={labelClass}>Tamaño aprox.</span>
          <input className={fieldClass} name="approximateSize" required />
          {errors.approximateSize ? (
            <span className="text-sm text-red-300">{errors.approximateSize}</span>
          ) : null}
        </label>
        <label className="block">
          <span className={labelClass}>Presupuesto opcional</span>
          <input className={fieldClass} min="1" name="budgetClp" type="number" />
          {errors.budgetClp ? (
            <span className="text-sm text-red-300">{errors.budgetClp}</span>
          ) : null}
        </label>
      </div>

      {errors.form ? <p className="text-sm text-red-300">{errors.form}</p> : null}
      {createdId ? (
        <p className="rounded-2xl border border-emerald-700 bg-emerald-950/50 p-3 text-sm text-emerald-200">
          Solicitud recibida. ID local: {createdId}
        </p>
      ) : null}

      <button
        className="rounded-full bg-amber-300 px-6 py-3 font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
