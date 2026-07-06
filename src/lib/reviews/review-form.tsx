"use client";

import { FormEvent, useState } from "react";
import { BotProtectionFields } from "@/lib/bot-protection-fields";

export function ReviewForm({ initialToken }: { initialToken: string }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: formData.get("token"),
          rating: formData.get("rating"),
          comment: formData.get("comment"),
          publicName: formData.get("publicName"),
          publishConsent: formData.get("publishConsent") === "on",
          companyWebsite: formData.get("companyWebsite"),
          submittedAt: formData.get("submittedAt"),
        }),
      });
      const body = (await response.json()) as { errors?: Record<string, string> };

      if (!response.ok) {
        setError(Object.values(body.errors ?? {})[0] ?? "No se pudo enviar la opinión.");
        return;
      }

      form.reset();
      setSuccess(true);
    } catch {
      setError("No se pudo enviar la opinión.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-3xl border border-emerald-300/30 bg-emerald-400/10 p-6 text-emerald-100">
        Gracias por compartir tu experiencia. Tu opinión quedó pendiente de moderación.
      </div>
    );
  }

  return (
    <form
      className="grid gap-4 rounded-3xl border border-stone-800 bg-stone-950/70 p-6"
      onSubmit={submitReview}
    >
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <BotProtectionFields />
      <input name="token" type="hidden" value={initialToken} />
      <label className="grid gap-1 text-sm font-semibold text-stone-200">
        Calificación
        <select
          className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
          name="rating"
          required
        >
          <option value="">Selecciona</option>
          {[5, 4, 3, 2, 1].map((rating) => (
            <option key={rating} value={rating}>
              {rating} estrellas
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold text-stone-200">
        Nombre público o iniciales
        <input
          className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
          maxLength={80}
          name="publicName"
          required
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-stone-200">
        Opinión
        <textarea
          className="min-h-36 rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
          maxLength={1200}
          name="comment"
          required
        />
      </label>
      <label className="flex gap-3 text-sm text-stone-300">
        <input className="mt-1" name="publishConsent" required type="checkbox" />
        Autorizo publicar esta opinión con mi nombre público/iniciales y sin datos privados.
      </label>
      <button
        className="rounded-full bg-amber-300 px-6 py-3 font-semibold text-stone-950 disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Enviando…" : "Enviar opinión"}
      </button>
    </form>
  );
}
