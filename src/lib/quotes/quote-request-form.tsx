"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { appConfig } from "@/lib/config/app";
import { BotProtectionFields } from "@/lib/bot-protection-fields";
import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";

type QuoteFormErrors = Record<string, string>;
type HandoffChannel = "whatsapp" | "email" | "instagram";
type PublicCalendarDate = {
  date: string;
  status: "AVAILABLE" | "PENDING_CONFIRMATION" | "OCCUPIED";
};
type CreatedQuoteResponse = {
  quoteCode?: string;
  errors?: QuoteFormErrors;
};

const fieldClass =
  "mt-1 w-full rounded-2xl border border-white/10 bg-zinc-950/90 px-4 py-3 text-zinc-100 shadow-inner shadow-black/20 transition placeholder:text-zinc-700 focus:border-zinc-400 focus:outline-none";
const labelClass = "text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500";
const unavailableStatuses = new Set<PublicCalendarDate["status"]>(["PENDING_CONFIRMATION", "OCCUPIED"]);

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function addMonths(month: string, offset: number) {
  const [year = new Date().getUTCFullYear(), monthNumber = 1] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1, 12)).toISOString().slice(0, 7);
}

function formatCalendarDay(date: string) {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    day: "numeric",
    timeZone: "America/Santiago",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function getPublicStatusLabel(status: PublicCalendarDate["status"]) {
  const labels: Record<PublicCalendarDate["status"], string> = {
    AVAILABLE: "Libre",
    PENDING_CONFIRMATION: "Por confirmar",
    OCCUPIED: "Ocupado",
  };
  return labels[status];
}

function PreferredDateCalendar({ error }: { error?: string }) {
  const currentMonth = getCurrentMonth();
  const [month, setMonth] = useState(currentMonth);
  const [dates, setDates] = useState<PublicCalendarDate[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CL", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${month}-01T12:00:00.000Z`)),
    [month],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      setLoading(true);
      setCalendarError(null);
      try {
        const response = await fetch(`/api/calendar/availability?month=${encodeURIComponent(month)}`);
        const body = (await response.json()) as { dates?: PublicCalendarDate[]; error?: string };
        if (!response.ok || !body.dates) throw new Error(body.error ?? "calendar unavailable");

        if (!cancelled) {
          setDates(body.dates);
          setSelectedDate((current) => {
            const selected = body.dates?.find((item) => item.date === current);
            return selected && unavailableStatuses.has(selected.status) ? "" : current;
          });
        }
      } catch {
        if (!cancelled) {
          setDates([]);
          setCalendarError("No pudimos cargar la disponibilidad. Puedes enviar la solicitud sin fecha.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [month]);

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-4 shadow-inner shadow-black/30 sm:p-5" aria-labelledby="quote-calendar-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className={labelClass}>Calendario interactivo</span>
          <h3 className="mt-1 text-lg font-semibold capitalize text-zinc-100" id="quote-calendar-title">{monthLabel}</h3>
          <p className="mt-1 text-xs text-zinc-500">Selecciona una fecha libre. La cita queda sujeta a confirmación.</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 disabled:opacity-35" disabled={month <= currentMonth} onClick={() => setMonth(addMonths(month, -1))} type="button">Anterior</button>
          <button className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-white/30" onClick={() => setMonth(addMonths(month, 1))} type="button">Siguiente</button>
        </div>
      </div>

      <input name="preferredTattooDate" type="hidden" value={selectedDate} />
      <div aria-label="Disponibilidad mensual" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7" role="list">
        {dates.map((item) => {
          const unavailable = unavailableStatuses.has(item.status);
          const selected = selectedDate === item.date;
          return (
            <button
              aria-pressed={selected}
              className={`rounded-2xl border px-3 py-3 text-left text-sm transition disabled:cursor-not-allowed ${selected ? "border-white bg-white text-black" : unavailable ? "border-white/5 bg-black/35 text-zinc-600" : "border-white/10 bg-zinc-950 text-zinc-200 hover:border-white/35 hover:bg-zinc-900"}`}
              disabled={unavailable}
              key={item.date}
              onClick={() => setSelectedDate(item.date)}
              type="button"
            >
              <span className="block font-semibold capitalize">{formatCalendarDay(item.date)}</span>
              <span className="mt-1 block text-[11px] opacity-75">{getPublicStatusLabel(item.status)}</span>
            </button>
          );
        })}
      </div>
      {loading ? <p className="mt-3 text-xs text-zinc-500">Actualizando disponibilidad…</p> : null}
      {calendarError ? <p className="mt-3 text-xs text-zinc-300">{calendarError}</p> : null}
      {error ? <span className="mt-2 block text-sm text-red-300">{error}</span> : null}
    </section>
  );
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function buildHandoffMessage(formData: FormData, quoteCode: string, channel: HandoffChannel) {
  const phone = readText(formData, "phone");
  const date = readText(formData, "preferredTattooDate");
  const budget = readText(formData, "budgetClp");
  const channelLabel = channel === "whatsapp" ? "WhatsApp" : channel === "email" ? "Email" : "Instagram";
  return [
    `Hola ${appConfig.studioName}, envié una cotización desde la web.`,
    `Código: ${quoteCode}`,
    `Nombre: ${readText(formData, "customerName")}`,
    `Email: ${readText(formData, "email")}`,
    phone ? `Teléfono: ${phone}` : null,
    `Canal elegido: ${channelLabel}`,
    `Idea: ${readText(formData, "description")}`,
    `Zona: ${readText(formData, "bodyPlacement")}`,
    `Tamaño aproximado: ${readText(formData, "approximateSize")}`,
    date ? `Fecha tentativa: ${date}` : null,
    budget ? `Presupuesto aproximado: $${Number(budget).toLocaleString("es-CL")}` : null,
    "Adjuntaré las imágenes de referencia por este medio para que puedas evaluar correctamente el diseño.",
  ].filter((line): line is string => Boolean(line)).join("\n");
}

function buildEmailUrl(message: string, quoteCode: string) {
  if (!appConfig.contactEmail) return null;
  return `mailto:${encodeURIComponent(appConfig.contactEmail)}?subject=${encodeURIComponent(`Cotización ${quoteCode} · ${appConfig.studioName}`)}&body=${encodeURIComponent(message)}`;
}

export function QuoteRequestForm({ fileUploadsEnabled: _fileUploadsEnabled = false }: { fileUploadsEnabled?: boolean }) {
  void _fileUploadsEnabled;
  const [errors, setErrors] = useState<QuoteFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<HandoffChannel>("whatsapp");
  const [createdQuoteCode, setCreatedQuoteCode] = useState<string | null>(null);
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);
  const [createdChannel, setCreatedChannel] = useState<HandoffChannel | null>(null);
  const [createdHandoffUrl, setCreatedHandoffUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const emailConfigured = Boolean(appConfig.contactEmail);
  const instagramConfigured = Boolean(appConfig.instagramUrl);

  async function copyMessage(message = createdMessage) {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("preferredContactMethod", channel === "email" ? "email" : "whatsapp");

    setSubmitting(true);
    setErrors({});
    setCreatedQuoteCode(null);
    setCreatedMessage(null);
    setCreatedHandoffUrl(null);

    try {
      const response = await fetch("/api/quotes", { method: "POST", body: formData });
      const result = (await response.json()) as CreatedQuoteResponse;
      if (!response.ok) {
        setErrors(result.errors ?? { form: "No se pudo enviar la solicitud." });
        return;
      }

      const quoteCode = result.quoteCode ?? "código por confirmar";
      const message = buildHandoffMessage(formData, quoteCode, channel);
      let handoffUrl: string | null = null;

      if (channel === "whatsapp" && hasWhatsAppConfig(appConfig.whatsappPhone)) {
        handoffUrl = buildWhatsAppUrl({ phone: appConfig.whatsappPhone, message });
      } else if (channel === "email") {
        handoffUrl = buildEmailUrl(message, quoteCode);
      } else if (channel === "instagram" && appConfig.instagramUrl) {
        handoffUrl = appConfig.instagramUrl;
        await copyMessage(message);
      }

      setCreatedQuoteCode(quoteCode);
      setCreatedMessage(message);
      setCreatedChannel(channel);
      setCreatedHandoffUrl(handoffUrl);
      form.reset();
      setEmail("");
      if (handoffUrl) window.open(handoffUrl, "_blank", "noopener,noreferrer");
    } catch {
      setErrors({ form: "No pudimos procesar la solicitud. Inténtalo nuevamente." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6 rounded-[2rem] border border-white/10 bg-black/60 p-5 shadow-2xl shadow-black/40 backdrop-blur sm:p-8" onSubmit={handleSubmit}>
      <BotProtectionFields />
      <div className="border-b border-white/10 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Proyecto personalizado</p>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">Solicita tu cotización</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">La solicitud se guarda primero y luego se abre el canal privado que elijas para enviar las imágenes de referencia.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className={labelClass}>Nombre</span><input autoComplete="name" className={fieldClass} name="customerName" required />{errors.customerName ? <span className="text-sm text-red-300">{errors.customerName}</span> : null}</label>
        <label><span className={labelClass}>Email</span><input autoComplete="email" className={fieldClass} name="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />{errors.email ? <span className="text-sm text-red-300">{errors.email}</span> : null}</label>
        <label><span className={labelClass}>Teléfono opcional</span><input autoComplete="tel" className={fieldClass} name="phone" type="tel" />{errors.phone ? <span className="text-sm text-red-300">{errors.phone}</span> : null}</label>
        <fieldset>
          <legend className={labelClass}>Continuar después por</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {([[
              "whatsapp", "WhatsApp", true,
            ], ["email", "Email", emailConfigured], ["instagram", "Instagram", instagramConfigured]] as const).map(([value, label, enabled]) => (
              <label className={`cursor-pointer rounded-2xl border p-3 text-center text-xs font-semibold transition ${channel === value ? "border-white bg-white text-black" : "border-white/10 bg-zinc-950 text-zinc-300"} ${enabled ? "" : "cursor-not-allowed opacity-40"}`} key={value}>
                <input checked={channel === value} className="sr-only" disabled={!enabled} onChange={() => setChannel(value)} type="radio" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <label className="block"><span className={labelClass}>Idea / descripción</span><textarea className={fieldClass} name="description" placeholder="Ej.: retrato realista en negro y grises, antebrazo interno, aproximadamente 18 cm…" required rows={5} />{errors.description ? <span className="text-sm text-red-300">{errors.description}</span> : null}</label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label><span className={labelClass}>Zona del cuerpo</span><input className={fieldClass} name="bodyPlacement" required />{errors.bodyPlacement ? <span className="text-sm text-red-300">{errors.bodyPlacement}</span> : null}</label>
        <label><span className={labelClass}>Tamaño aprox.</span><input className={fieldClass} name="approximateSize" required />{errors.approximateSize ? <span className="text-sm text-red-300">{errors.approximateSize}</span> : null}</label>
        <label><span className={labelClass}>Presupuesto opcional</span><input className={fieldClass} min="1" name="budgetClp" type="number" />{errors.budgetClp ? <span className="text-sm text-red-300">{errors.budgetClp}</span> : null}</label>
      </div>

      <PreferredDateCalendar error={errors.preferredTattooDate} />

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-7 text-zinc-300"><strong className="text-white">Imágenes de referencia:</strong> después de registrar la cotización se abrirá {channel === "whatsapp" ? "WhatsApp" : channel === "email" ? "tu correo" : "Instagram"}. Adjunta allí las imágenes que permitan evaluar composición, estilo y nivel de detalle.</div>

      <fieldset className="space-y-3 rounded-3xl border border-white/10 bg-zinc-950/70 p-4">
        <legend className={labelClass}>Autorizaciones</legend>
        <label className="flex gap-3 text-sm leading-6 text-zinc-300"><input className="mt-1" name="dataProcessingConsent" required type="checkbox" /><span>Autorizo el uso de mis datos para gestionar esta cotización según la <a className="underline" href="/privacidad">política de privacidad</a>.</span></label>
        {errors.dataProcessingConsent ? <span className="block text-sm text-red-300">{errors.dataProcessingConsent}</span> : null}
        <label className="flex gap-3 text-sm leading-6 text-zinc-300"><input className="mt-1" name="imageHandlingConsent" required type="checkbox" /><span>Entiendo que enviaré las imágenes de referencia por el canal privado elegido después de registrar la solicitud.</span></label>
        {errors.imageHandlingConsent ? <span className="block text-sm text-red-300">{errors.imageHandlingConsent}</span> : null}
        <label className="flex gap-3 text-sm leading-6 text-zinc-300"><input className="mt-1" name="privacyTermsConsent" required type="checkbox" /><span>Acepto la privacidad y los <a className="underline" href="/terminos-reserva">términos de reserva</a>; la fecha queda sujeta a confirmación.</span></label>
        {errors.privacyTermsConsent ? <span className="block text-sm text-red-300">{errors.privacyTermsConsent}</span> : null}
        <label className="flex gap-3 text-sm leading-6 text-zinc-400"><input className="mt-1" name="marketingOptIn" type="checkbox" /><span>Quiero recibir novedades o disponibilidad futura del estudio.</span></label>
      </fieldset>

      {errors.form ? <p className="rounded-2xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">{errors.form}</p> : null}

      {createdQuoteCode ? (
        <section aria-live="polite" className="rounded-3xl border border-white/15 bg-gradient-to-br from-zinc-900 to-black p-5 text-sm text-zinc-200">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Cotización registrada</p>
          <h3 className="mt-2 text-xl font-black text-white">Código <span className="font-mono">{createdQuoteCode}</span></h3>
          <p className="mt-2 leading-6 text-zinc-400">Guarda este código. Ahora adjunta las imágenes de referencia por {createdChannel === "whatsapp" ? "WhatsApp" : createdChannel === "email" ? "email" : "Instagram"}.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {createdHandoffUrl ? <a className="rounded-full bg-white px-4 py-2 font-semibold text-black" href={createdHandoffUrl} rel="noreferrer" target="_blank">Continuar por {createdChannel === "whatsapp" ? "WhatsApp" : createdChannel === "email" ? "email" : "Instagram"}</a> : null}
            <button className="rounded-full border border-white/15 px-4 py-2 font-semibold" onClick={() => void copyMessage()} type="button">{copied ? "Mensaje copiado" : "Copiar mensaje completo"}</button>
            <a className="rounded-full border border-white/15 px-4 py-2 font-semibold" href={`/quote/status?code=${encodeURIComponent(createdQuoteCode)}`}>Seguimiento de cotización</a>
          </div>
        </section>
      ) : null}

      <button className="w-full rounded-full bg-white px-6 py-3.5 font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50 sm:w-auto" disabled={submitting} type="submit">{submitting ? "Registrando cotización…" : "Registrar y continuar"}</button>
    </form>
  );
}
