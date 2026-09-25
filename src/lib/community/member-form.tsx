"use client";

import { FormEvent, useState } from "react";
import { BotProtectionFields } from "@/lib/bot-protection-fields";
import { appConfig } from "@/lib/config/app";

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

const fieldClass =
  "rounded-xl border border-white/12 bg-[#0b0b0d] px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-60";

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

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/community-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          companyWebsite: formData.get("companyWebsite"),
          submittedAt: formData.get("submittedAt"),
        }),
      });
      const body = (await response.json()) as CommunityMemberResponse;

      if (!response.ok) {
        setErrors(body.errors ?? { form: "No pudimos guardar tu inscripción." });
        return;
      }

      setForm(initialFormState);
      setMessage("Listo. Te avisaremos solo cuando haya algo que realmente valga la pena compartir.");
    } catch {
      setErrors({ form: "No pudimos conectar con el servidor. Intenta nuevamente." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submitCommunityMember}>
      <BotProtectionFields />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-zinc-300">
          Nombre
          <input
            autoComplete="name"
            className={fieldClass}
            disabled={submitting}
            maxLength={80}
            name="fullName"
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            placeholder="Tu nombre"
            required
            value={form.fullName}
          />
          {errors.fullName ? <span className="text-xs text-red-300">{errors.fullName}</span> : null}
        </label>

        <label className="grid gap-2 text-sm font-semibold text-zinc-300">
          Email
          <input
            autoComplete="email"
            className={fieldClass}
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

      <label className="flex gap-3 rounded-xl border border-white/10 bg-[#0b0b0d] p-4 text-sm leading-6 text-zinc-400">
        <input
          checked={form.marketingConsent}
          className="mt-1 h-4 w-4 accent-zinc-300"
          disabled={submitting}
          name="marketingConsent"
          onChange={(event) => setForm((current) => ({ ...current, marketingConsent: event.target.checked }))}
          required
          type="checkbox"
        />
        <span>
          Acepto recibir novedades y contenido de <span className="font-semibold text-zinc-200">{appConfig.brandName}</span>. Puedo salir de la lista cuando quiera.
        </span>
      </label>

      {errors.marketingConsent ? <p className="text-sm text-red-300">{errors.marketingConsent}</p> : null}

      <button
        className="rounded-full border border-white/18 bg-[#151518] px-6 py-3 font-bold text-zinc-100 transition hover:border-white/35 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Guardando…" : "Quiero recibir novedades"}
      </button>

      {errors.form ? <p className="text-sm text-red-300">{errors.form}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
    </form>
  );
}
