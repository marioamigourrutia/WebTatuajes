"use client";

import { useState, type FormEvent } from "react";

type QuoteFormErrors = Record<string, string>;

const fieldClass =
  "mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100";
const labelClass = "text-xs font-semibold uppercase tracking-[0.2em] text-stone-400";
const maxReferenceImageCount = 3;
const maxReferenceImageSizeBytes = 5 * 1024 * 1024;

type QuoteRequestFormProps = {
  showLocalTestingNote?: boolean;
};

export function QuoteRequestForm({ showLocalTestingNote = false }: QuoteRequestFormProps) {
  const [errors, setErrors] = useState<QuoteFormErrors>({});
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validateReferenceImages(files: FileList | null) {
    const nextErrors: QuoteFormErrors = {};

    if (!files || files.length === 0) {
      return nextErrors;
    }

    if (files.length > maxReferenceImageCount) {
      nextErrors.referenceImages = `Podés adjuntar hasta ${maxReferenceImageCount} imágenes.`;
    }

    Array.from(files).forEach((file, index) => {
      if (!file.type.startsWith("image/")) {
        nextErrors[`referenceImages.${index}`] = "Solo se permiten archivos de imagen.";
      }

      if (file.size > maxReferenceImageSizeBytes) {
        nextErrors[`referenceImages.${index}`] = "Cada imagen debe pesar 5 MB o menos.";
      }
    });

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    setErrors({});
    setCreatedId(null);

    const formData = new FormData(form);
    const imageErrors = validateReferenceImages(
      form.querySelector<HTMLInputElement>('input[name="referenceImages"]')?.files ?? null,
    );

    if (Object.keys(imageErrors).length > 0) {
      setErrors(imageErrors);
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        body: formData,
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
        <h2 className="text-3xl font-black text-stone-50">Formulario de cotización</h2>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          Guardamos la solicitud desde una ruta server-side. El formulario solo muestra éxito si el
          servidor confirma la creación y devuelve un ID.
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
        <textarea
          className={fieldClass}
          name="description"
          placeholder="Ej.: flores nativas en línea fina, antebrazo interno, referencia en blanco y negro…"
          required
          rows={5}
        />
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

      <label className="block">
        <span className={labelClass}>Imágenes de referencia opcionales</span>
        <input
          accept="image/jpeg,image/png,image/webp,image/gif"
          className={fieldClass}
          multiple
          name="referenceImages"
          type="file"
        />
        <span className="mt-1 block text-xs text-stone-500">
          Hasta 3 imágenes JPG, PNG, WEBP o GIF. Máximo 5 MB cada una.
        </span>
        {errors.referenceImages ? (
          <span className="text-sm text-red-300">{errors.referenceImages}</span>
        ) : null}
        {Object.entries(errors)
          .filter(([key]) => key.startsWith("referenceImages."))
          .map(([key, message]) => (
            <span className="block text-sm text-red-300" key={key}>
              {message}
            </span>
          ))}
      </label>

      {errors.form ? <p className="text-sm text-red-300">{errors.form}</p> : null}
      {createdId ? (
        <div className="rounded-2xl border border-emerald-700 bg-emerald-950/50 p-4 text-sm text-emerald-100">
          <p className="font-semibold">Solicitud recibida correctamente.</p>
          <p className="mt-1 text-emerald-200">
            Guardamos tu cotización con ID local <span className="font-mono">{createdId}</span>. El
            estudio puede revisarla desde el panel interno.
          </p>
          {showLocalTestingNote ? (
            <p className="mt-3 text-emerald-200">
              Prueba local: después de iniciar sesión como admin, podés verla y cambiar su estado en{" "}
              <a className="font-semibold underline underline-offset-4" href="/admin">
                /admin
              </a>
              .
            </p>
          ) : null}
        </div>
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
