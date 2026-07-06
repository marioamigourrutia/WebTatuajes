"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { appConfig } from "@/lib/config/app";
import { BotProtectionFields } from "@/lib/bot-protection-fields";
import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";

type QuoteFormErrors = Record<string, string>;

const fieldClass =
  "mt-1 w-full rounded-2xl border border-stone-700 bg-stone-900/90 px-4 py-3 text-stone-100 transition placeholder:text-stone-600 focus:border-amber-300";
const labelClass = "text-xs font-semibold uppercase tracking-[0.2em] text-stone-400";
const unavailablePublicStatuses = new Set(["PENDING_CONFIRMATION", "OCCUPIED"]);

type PublicCalendarDate = {
  date: string;
  status: "AVAILABLE" | "PENDING_CONFIRMATION" | "OCCUPIED";
};

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function addMonths(month: string, offset: number) {
  const [year = new Date().getUTCFullYear(), monthNumber = 1] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1, 12));
  return date.toISOString().slice(0, 7);
}

function formatCalendarDay(date: string) {
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", timeZone: "America/Santiago" }).format(
    new Date(`${date}T12:00:00.000Z`),
  );
}

function getPublicStatusLabel(status: PublicCalendarDate["status"]) {
  const labels = {
    AVAILABLE: "Libre",
    PENDING_CONFIRMATION: "Por confirmar",
    OCCUPIED: "Ocupado",
  } satisfies Record<PublicCalendarDate["status"], string>;

  return labels[status];
}

function PreferredDateCalendar({ error }: { error?: string }) {
  const [month, setMonth] = useState(getCurrentMonth);
  const [dates, setDates] = useState<PublicCalendarDate[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" }).format(
        new Date(`${month}-01T12:00:00.000Z`),
      ),
    [month],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      setLoading(true);
      setCalendarError(null);
      try {
        const response = await fetch(
          `/api/calendar/availability?month=${encodeURIComponent(month)}`,
        );
        const body = (await response.json()) as { dates?: PublicCalendarDate[]; error?: string };

        if (!response.ok || !body.dates) {
          throw new Error(body.error ?? "calendar unavailable");
        }

        if (!cancelled) {
          setDates(body.dates);
          if (selectedDate) {
            const selected = body.dates.find((date) => date.date === selectedDate);
            if (selected && unavailablePublicStatuses.has(selected.status)) setSelectedDate("");
          }
        }
      } catch {
        if (!cancelled) {
          setDates([]);
          setCalendarError(
            "No pudimos cargar la disponibilidad. Puedes enviar la solicitud sin fecha.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [month, selectedDate]);

  return (
    <div className="rounded-3xl border border-stone-800 bg-stone-900/50 p-4 shadow-inner shadow-black/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className={labelClass}>Fecha preferida para tatuarte</span>
          <p className="mt-1 text-sm capitalize text-stone-200">{monthLabel}</p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-full border border-stone-700 px-3 py-1 text-sm text-stone-200 transition hover:border-amber-300/50"
            onClick={() => setMonth(addMonths(month, -1))}
            type="button"
          >
            Mes anterior
          </button>
          <button
            className="rounded-full border border-stone-700 px-3 py-1 text-sm text-stone-200 transition hover:border-amber-300/50"
            onClick={() => setMonth(addMonths(month, 1))}
            type="button"
          >
            Mes siguiente
          </button>
        </div>
      </div>
      <input name="preferredTattooDate" type="hidden" value={selectedDate} />
      <div
        aria-label="Disponibilidad mensual"
        className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7"
        role="list"
      >
        {dates.map((date) => {
          const unavailable = unavailablePublicStatuses.has(date.status);
          const selected = selectedDate === date.date;
          return (
            <button
              aria-pressed={selected}
              className={`rounded-xl border px-2 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? "border-amber-300 bg-amber-300 text-stone-950"
                  : "border-stone-700 bg-stone-950 text-stone-200 hover:border-amber-300/60"
              }`}
              disabled={unavailable}
              key={date.date}
              onClick={() => setSelectedDate(date.date)}
              type="button"
            >
              <span className="block font-semibold">{formatCalendarDay(date.date)}</span>
              <span className="block text-xs">{getPublicStatusLabel(date.status)}</span>
            </button>
          );
        })}
      </div>
      {loading ? <p className="mt-2 text-xs text-stone-500">Cargando disponibilidad…</p> : null}
      {calendarError ? <p className="mt-2 text-xs text-amber-200">{calendarError}</p> : null}
      <span className="mt-2 block text-xs text-stone-500">
        La fecha es tentativa y queda por confirmar con el estudio. No se muestran detalles privados
        de otras reservas.
      </span>
      {error ? <span className="text-sm text-red-300">{error}</span> : null}
    </div>
  );
}

type CreatedQuoteResponse = {
  quoteCode?: string;
  whatsappMessage?: string;
  errors?: QuoteFormErrors;
};

export function QuoteRequestForm({ fileUploadsEnabled: _fileUploadsEnabled = false }: { fileUploadsEnabled?: boolean }) {
  void _fileUploadsEnabled;
  const [errors, setErrors] = useState<QuoteFormErrors>({});
  const [createdQuoteCode, setCreatedQuoteCode] = useState<string | null>(null);
  const [createdWhatsAppUrl, setCreatedWhatsAppUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    setErrors({});
    setCreatedQuoteCode(null);
    setCreatedWhatsAppUrl(null);

    const formData = new FormData(form);

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as CreatedQuoteResponse;

      if (!response.ok) {
        setErrors(result.errors ?? { form: "No se pudo enviar la solicitud." });
        return;
      }

      form.reset();
      setEmail("");
      setCreatedQuoteCode(result.quoteCode ?? "código por confirmar");
      if (result.whatsappMessage && hasWhatsAppConfig(appConfig.whatsappPhone)) {
        const whatsappUrl = buildWhatsAppUrl({
          phone: appConfig.whatsappPhone,
          message: result.whatsappMessage,
        });
        setCreatedWhatsAppUrl(whatsappUrl);
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      setErrors({ form: "No pudimos procesar la solicitud. Inténtalo nuevamente." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-5 rounded-[2rem] border border-amber-100/10 bg-stone-950/75 p-6 shadow-2xl shadow-black/25 sm:p-8"
      onSubmit={handleSubmit}
    >
      <BotProtectionFields />
      <div>
        <h2 className="text-3xl font-black text-stone-50">Formulario de cotización</h2>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          Completa los datos clave para que el estudio pueda evaluar tu idea y responder con los
          próximos pasos. La fecha que indiques es referencial y no confirma una reserva.
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
          <input
            className={fieldClass}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          <span className="mt-1 block text-xs text-stone-500">
            Usaremos este email solo para registrar tu solicitud y que el estudio pueda identificarla.
          </span>
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

      <PreferredDateCalendar error={errors.preferredTattooDate} />

      <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
        Las referencias, fotos o enlaces se envían directamente por WhatsApp después de registrar la
        solicitud. Así evitamos subir imágenes al formulario público.
      </div>

      <fieldset className="space-y-3 rounded-3xl border border-stone-800 bg-stone-900/50 p-4">
        <legend className={labelClass}>Autorizaciones</legend>
        <label className="flex gap-3 text-sm leading-6 text-stone-300">
          <input className="mt-1" name="dataProcessingConsent" required type="checkbox" />
          <span>
            Autorizo el uso de mis datos para gestionar esta cotización y recibir respuesta del
            estudio según la <a className="underline underline-offset-4" href="/privacidad">política de privacidad</a>.
          </span>
        </label>
        {errors.dataProcessingConsent ? (
          <span className="block text-sm text-red-300">{errors.dataProcessingConsent}</span>
        ) : null}
        <label className="flex gap-3 text-sm leading-6 text-stone-300">
          <input className="mt-1" name="imageHandlingConsent" required type="checkbox" />
          <span>
            Entiendo que las imágenes o enlaces de referencia se enviarán después por WhatsApp o por
            el canal privado acordado. Reviso el <a className="underline underline-offset-4" href="/manejo-imagenes">manejo de imágenes</a>.
          </span>
        </label>
        {errors.imageHandlingConsent ? (
          <span className="block text-sm text-red-300">{errors.imageHandlingConsent}</span>
        ) : null}
        <label className="flex gap-3 text-sm leading-6 text-stone-300">
          <input className="mt-1" name="privacyTermsConsent" required type="checkbox" />
          <span>
            Acepto las condiciones de privacidad, la <a className="underline underline-offset-4" href="/solicitud-datos">solicitud de datos</a> y entiendo que cualquier reserva o fecha queda por
            confirmar directamente con el estudio según los <a className="underline underline-offset-4" href="/terminos-reserva">términos de reserva</a>.
          </span>
        </label>
        {errors.privacyTermsConsent ? (
          <span className="block text-sm text-red-300">{errors.privacyTermsConsent}</span>
        ) : null}
        <label className="flex gap-3 text-sm leading-6 text-stone-300">
          <input className="mt-1" name="marketingOptIn" type="checkbox" />
          <span>
            Quiero recibir novedades, contenido de comunidad o disponibilidad futura del estudio.
          </span>
        </label>
      </fieldset>

      {errors.form ? <p className="text-sm text-red-300">{errors.form}</p> : null}
      {createdQuoteCode ? (
        <div className="rounded-2xl border border-emerald-700 bg-emerald-950/50 p-4 text-sm text-emerald-100">
          <p className="font-semibold">Solicitud recibida correctamente.</p>
          <p className="mt-1 text-emerald-200">
            Registramos tu cotización con el código{" "}
            <span className="font-mono">{createdQuoteCode}</span>. La fecha solicitada queda por
            confirmar; ahora puedes enviar las referencias por WhatsApp con este código.
          </p>
          {createdWhatsAppUrl ? (
            <a
              className="mt-3 inline-flex rounded-full bg-emerald-200 px-4 py-2 font-semibold text-emerald-950 transition hover:bg-emerald-100"
              href={createdWhatsAppUrl}
              rel="noreferrer"
              target="_blank"
            >
              Abrir WhatsApp con la cotización
            </a>
          ) : null}
          <a
            className="mt-3 inline-flex font-semibold text-emerald-50 underline underline-offset-4"
            href={`/quote/status?code=${encodeURIComponent(createdQuoteCode)}`}
          >
            Consultar estado de esta cotización
          </a>
        </div>
      ) : null}

      <button
        className="rounded-full bg-amber-300 px-6 py-3 font-semibold text-stone-950 shadow-lg shadow-amber-950/30 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
