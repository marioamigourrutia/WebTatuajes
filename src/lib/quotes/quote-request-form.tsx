"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  type User,
} from "firebase/auth";
import { appConfig } from "@/lib/config/app";
import { BotProtectionFields } from "@/lib/bot-protection-fields";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";

type QuoteFormErrors = Record<string, string>;

const fieldClass =
  "mt-1 w-full rounded-2xl border border-stone-700 bg-stone-900/90 px-4 py-3 text-stone-100 transition placeholder:text-stone-600 focus:border-amber-300";
const labelClass = "text-xs font-semibold uppercase tracking-[0.2em] text-stone-400";
const maxReferenceImageCount = 3;
const maxReferenceImageSizeBytes = 5 * 1024 * 1024;
const unavailablePublicStatuses = new Set(["PENDING_CONFIRMATION", "OCCUPIED"]);
const pendingQuoteEmailStorageKey = "webtatuajes.quote.pendingEmail";

const quoteVerificationFallbackMessage =
  "Hola HuespedTattooStudio, quiero solicitar una cotización de tatuaje, pero no pude completar la verificación por email en el sitio.";
const requiredEmailVerificationMessage = "Verificación de email obligatoria.";

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

export function QuoteRequestForm({ fileUploadsEnabled = false }: { fileUploadsEnabled?: boolean }) {
  const [auth] = useState(() => getFirebaseAuth());
  const [errors, setErrors] = useState<QuoteFormErrors>({});
  const [createdQuoteCode, setCreatedQuoteCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [verifiedUser, setVerifiedUser] = useState<User | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [showVerificationFallback, setShowVerificationFallback] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);

  const verifiedEmail = verifiedUser?.email?.toLowerCase() ?? "";
  const emailMatchesVerifiedUser = Boolean(verifiedEmail && email.toLowerCase() === verifiedEmail);
  const verificationFallbackUrl = hasWhatsAppConfig(appConfig.whatsappPhone)
    ? buildWhatsAppUrl({
        phone: appConfig.whatsappPhone,
        message: quoteVerificationFallbackMessage,
      })
    : null;

  useEffect(() => {
    if (!auth) return;

    return onAuthStateChanged(auth, (currentUser) => {
      const hasVerifiedEmail = Boolean(currentUser?.email && currentUser.emailVerified);
      setVerifiedUser(hasVerifiedEmail ? currentUser : null);
      if (currentUser?.email && currentUser.emailVerified) {
        setEmail(currentUser.email.toLowerCase());
      }
    });
  }, [auth]);

  useEffect(() => {
    if (!auth || typeof window === "undefined") return;

    const href = window.location.href;
    if (!isSignInWithEmailLink(auth, href)) return;

    const pendingEmail = window.localStorage.getItem(pendingQuoteEmailStorageKey);
    if (!pendingEmail) {
      void Promise.resolve().then(() => {
        setErrors({
          email: "Abre el enlace en el mismo navegador donde solicitaste la verificación.",
        });
        setShowVerificationFallback(true);
      });
      return;
    }

    void signInWithEmailLink(auth, pendingEmail, href)
      .then((credential) => {
        window.localStorage.removeItem(pendingQuoteEmailStorageKey);
        setVerifiedUser(credential.user.emailVerified ? credential.user : null);
        setEmail(credential.user.email?.toLowerCase() ?? pendingEmail.toLowerCase());
        setVerificationMessage(
          credential.user.emailVerified
            ? "Email verificado. Ya puedes enviar tu cotización."
            : "Recibimos el enlace, pero Firebase aún no marcó el email como verificado.",
        );
        setShowVerificationFallback(!credential.user.emailVerified);
        window.history.replaceState({}, "", window.location.pathname);
      })
      .catch(() => {
        setErrors({ email: "No pudimos completar la verificación. Solicita un nuevo enlace." });
        setShowVerificationFallback(true);
      });
  }, [auth]);

  async function sendVerificationLink() {
    const cleanEmail = email.trim().toLowerCase();

    if (!auth) {
      setErrors({ email: "La verificación por Firebase Auth no está configurada." });
      setShowVerificationFallback(true);
      return;
    }

    if (!cleanEmail) {
      setErrors({ email: "Ingresa tu email para enviar el enlace de verificación." });
      setShowVerificationFallback(false);
      return;
    }

    setSendingVerification(true);
    setErrors((current) => ({ ...current, email: "" }));
    setShowVerificationFallback(false);
    try {
      const actionUrl = process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/quote`
        : window.location.origin + window.location.pathname;

      await sendSignInLinkToEmail(auth, cleanEmail, {
        url: actionUrl,
        handleCodeInApp: true,
      });
      window.localStorage.setItem(pendingQuoteEmailStorageKey, cleanEmail);
      setVerificationMessage(
        "Te enviamos un enlace. Ábrelo en este navegador para verificar tu email.",
      );
    } catch {
      setErrors({ email: "No pudimos enviar el enlace. Revisa el email e inténtalo nuevamente." });
      setShowVerificationFallback(true);
    } finally {
      setSendingVerification(false);
    }
  }

  function validateReferenceImages(files: FileList | null) {
    const nextErrors: QuoteFormErrors = {};

    if (!files || files.length === 0) {
      return nextErrors;
    }

    if (files.length > maxReferenceImageCount) {
      nextErrors.referenceImages = `Puedes adjuntar hasta ${maxReferenceImageCount} imágenes.`;
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
    setCreatedQuoteCode(null);

    const formData = new FormData(form);

    const imageErrors = fileUploadsEnabled
      ? validateReferenceImages(
          form.querySelector<HTMLInputElement>('input[name="referenceImages"]')?.files ?? null,
        )
      : {};

    if (Object.keys(imageErrors).length > 0) {
      setErrors(imageErrors);
      setSubmitting(false);
      return;
    }

    if (!verifiedUser || !emailMatchesVerifiedUser) {
      setErrors({
        email: `${requiredEmailVerificationMessage} Verifica tu correo antes de enviar la cotización.`,
      });
      setShowVerificationFallback(true);
      setSubmitting(false);
      return;
    }

    try {
      const idToken = await verifiedUser.getIdToken();
      const headers: Record<string, string> = { Authorization: `Bearer ${idToken}` };
      formData.set("email", verifiedEmail);

      const response = await fetch("/api/quotes", {
        method: "POST",
        headers,
        body: formData,
      });
      const result = (await response.json()) as { quoteCode?: string; errors?: QuoteFormErrors };

      if (!response.ok) {
        setErrors(result.errors ?? { form: "No se pudo enviar la solicitud." });
        return;
      }

      form.reset();
      setEmail(verifiedEmail || "");
      setCreatedQuoteCode(result.quoteCode ?? "código por confirmar");
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
            readOnly={Boolean(verifiedEmail)}
            required
            type="email"
            value={email}
          />
          <span className="mt-1 block text-xs text-stone-500">
            Puedes verificar este email con un enlace seguro para asociar la cotización a tu correo.
          </span>
          <button
            className="mt-2 rounded-full border border-amber-300/50 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:border-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={sendingVerification || emailMatchesVerifiedUser}
            onClick={sendVerificationLink}
            type="button"
          >
            {emailMatchesVerifiedUser
              ? "Email verificado"
              : sendingVerification
                ? "Enviando enlace…"
                : "Verificar email"}
          </button>
          {verificationMessage ? (
            <span className="mt-2 block text-sm text-emerald-200">{verificationMessage}</span>
          ) : null}
          {errors.email ? <span className="text-sm text-red-300">{errors.email}</span> : null}
          {showVerificationFallback ? (
            <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">
              <p>
                Verificación de email obligatoria. Si la verificación por email no funciona,
                contacta al estudio para continuar por un canal directo.
              </p>
              {verificationFallbackUrl ? (
                <a
                  className="mt-2 inline-flex rounded-full bg-amber-300 px-4 py-2 text-xs font-semibold text-stone-950 transition hover:bg-amber-200"
                  href={verificationFallbackUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Contactar por WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}
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

      <label className="block">
        <span className={labelClass}>Enlaces de referencia opcionales</span>
        <textarea
          className={fieldClass}
          name="referenceUrls"
          placeholder="Pega un enlace por línea a referencias públicas de estilo, composición o inspiración."
          rows={4}
        />
        <span className="mt-1 block text-xs text-stone-500">
          Máximo 5 enlaces. No pegues fotos corporales, documentos privados ni enlaces que contengan
          datos personales.
        </span>
        {errors.referenceUrls ? (
          <span className="text-sm text-red-300">{errors.referenceUrls}</span>
        ) : null}
        {Object.entries(errors)
          .filter(([key]) => key.startsWith("referenceUrls."))
          .map(([key, message]) => (
            <span className="block text-sm text-red-300" key={key}>
              {message}
            </span>
          ))}
      </label>

      {fileUploadsEnabled ? (
        <label className="block">
          <span className={labelClass}>Imágenes de referencia opcionales</span>
          <input
            accept="image/jpeg,image/png,image/webp"
            className={fieldClass}
            multiple
            name="referenceImages"
            type="file"
          />
          <span className="mt-1 block text-xs text-stone-500">
            Hasta 3 imágenes JPG, PNG o WEBP para referencias no sensibles o inspiración. Máximo 5
            MB cada una. GIF no está soportado. Si necesitas compartir fotos corporales sensibles,
            envíalas más adelante por el canal privado acordado hasta que habilitemos almacenamiento
            privado.
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
      ) : (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
          La carga directa de imágenes requiere un proveedor externo configurado. Puedes agregar
          enlaces públicos de inspiración o coordinar el envío de referencias privadas directamente
          con HuespedTattooStudio después de enviar la cotización.
        </div>
      )}

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
            Entiendo que las imágenes o enlaces enviados son voluntarios, deben ser referencias no
            sensibles o de inspiración, y pueden quedar disponibles mediante un enlace externo no
            listado. Para fotos corporales sensibles, las enviaré después por el canal privado
            acordado. Reviso el <a className="underline underline-offset-4" href="/manejo-imagenes">manejo de imágenes</a>.
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
            confirmar; el estudio revisará tu idea y responderá por el canal indicado.
          </p>
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
