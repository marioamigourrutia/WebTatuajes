"use client";

import { type FormEvent, useState } from "react";

type UnsubscribeResponse = {
  ok?: boolean;
  errors?: Partial<Record<"email" | "confirmation" | "form", string>>;
};

export function CommunityUnsubscribeForm() {
  const [errors, setErrors] = useState<UnsubscribeResponse["errors"]>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitUnsubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmitting(true);
    setErrors({});
    setNotice(null);

    try {
      const response = await fetch("/api/community-members/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          confirmation: formData.get("confirmation"),
        }),
      });
      const body = (await response.json()) as UnsubscribeResponse;

      if (!response.ok) {
        setErrors(body.errors ?? { form: "No se pudo procesar la baja." });
        return;
      }

      form.reset();
      setNotice(
        "Solicitud recibida. Si el email estaba inscrito, dejaremos de enviarle comunicaciones de comunidad.",
      );
    } catch {
      setErrors({ form: "No se pudo procesar la baja. Inténtalo nuevamente." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submitUnsubscribe}>
      <div>
        <label className="text-sm font-semibold text-stone-100" htmlFor="email">
          Email inscrito
        </label>
        <input
          className="mt-2 w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-stone-100 outline-none transition focus:border-stone-400"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        {errors?.email ? <p className="mt-1 text-sm text-red-300">{errors.email}</p> : null}
      </div>

      <label className="flex gap-3 rounded-2xl border border-stone-800 bg-stone-950/60 p-4 text-sm text-stone-300">
        <input className="mt-1" name="confirmation" type="checkbox" required />
        <span>Confirmo que quiero dejar de recibir comunicaciones de comunidad.</span>
      </label>
      {errors?.confirmation ? <p className="text-sm text-red-300">{errors.confirmation}</p> : null}

      {errors?.form ? <p className="text-sm text-red-300">{errors.form}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}

      <button
        className="rounded-full bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Procesando…" : "Solicitar baja"}
      </button>
    </form>
  );
}
