"use client";

import { FormEvent, useState } from "react";

type FormState = {
  fullName: string;
  email: string;
  marketingConsent: boolean;
};

type CommunityMemberResponse = {
  ok?: boolean;
  errors?: Record<string, string>;
};

const initialFormState: FormState = {
  fullName: "",
  email: "",
  marketingConsent: false,
};

export function CommunityMemberForm() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submitCommunityMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setErrors({});

    try {
      const response = await fetch("/api/community-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await response.json()) as CommunityMemberResponse;

      if (!response.ok) {
        setErrors(body.errors ?? { form: "No pudimos guardar tu inscripción." });
        return;
      }

      setForm(initialFormState);
      setMessage(
        "Listo, te sumamos a la comunidad. Te escribiremos solo con novedades relevantes.",
      );
    } catch {
      setErrors({ form: "No pudimos conectar con el servidor. Intenta nuevamente." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submitCommunityMember}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Nombre completo
          <input
            autoComplete="name"
            className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-stone-100 outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            maxLength={80}
            name="fullName"
            onChange={(event) =>
              setForm((current) => ({ ...current, fullName: event.target.value }))
            }
            placeholder="Tu nombre"
            required
            value={form.fullName}
          />
          {errors.fullName ? <span className="text-xs text-red-300">{errors.fullName}</span> : null}
        </label>

        <label className="grid gap-2 text-sm font-semibold text-stone-200">
          Email
          <input
            autoComplete="email"
            className="rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-stone-100 outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            maxLength={160}
            name="email"
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="tu@email.com"
            required
            type="email"
            value={form.email}
          />
          {errors.email ? <span className="text-xs text-red-300">{errors.email}</span> : null}
        </label>
      </div>

      <label className="flex gap-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4 text-sm leading-6 text-stone-300">
        <input
          checked={form.marketingConsent}
          className="mt-1 h-4 w-4 accent-amber-300"
          disabled={submitting}
          name="marketingConsent"
          onChange={(event) =>
            setForm((current) => ({ ...current, marketingConsent: event.target.checked }))
          }
          required
          type="checkbox"
        />
        <span>
          Acepto recibir novedades, contenido y comunicaciones de la comunidad de{" "}
          <span className="font-semibold text-stone-100">WebTatuajes</span>. Puedo pedir salir de la
          lista cuando quiera.
        </span>
      </label>
      {errors.marketingConsent ? (
        <p className="text-sm text-red-300">{errors.marketingConsent}</p>
      ) : null}

      <button
        className="rounded-full bg-amber-300 px-6 py-3 font-semibold text-stone-950 shadow-lg shadow-amber-950/30 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Guardando…" : "Sumarme a la comunidad"}
      </button>

      {errors.form ? <p className="text-sm text-red-300">{errors.form}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
    </form>
  );
}
