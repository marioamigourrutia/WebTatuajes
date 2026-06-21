"use client";

import { useEffect, useState } from "react";
import { LoginPanel } from "@/lib/auth/login-panel";
import { useAuth } from "@/lib/auth/auth-context";
import { AdminPortfolioPanel } from "@/lib/portfolio/admin-portfolio-panel";
import { buildQuoteMailtoUrl, buildQuoteWhatsAppUrl } from "@/lib/quotes/contact-links";
import { formatClpPrice } from "@/lib/shop/catalog";
import {
  purchaseRequestStatusLabels,
  purchaseRequestStatuses,
} from "@/lib/shop/purchase-request-status";

type AdminStatusResponse = {
  authenticated: boolean;
  admin: boolean;
  profile: { uid: string; email: string | null; role: string } | null;
  configurationMessage?: string | null;
};

type RecentQuoteRequest = {
  id: string;
  quoteCode: string;
  createdAt: string | null;
  customerName: string;
  email: string;
  phone: string | null;
  status: string;
  preferredContactMethod: string;
  bodyPlacement: string;
  approximateSize: string;
  description: string;
  descriptionPreview: string;
  budgetClp: number | null;
  preferredTattooDate: string | null;
  calendarDateStatus: string | null;
  consents: {
    dataProcessing: boolean;
    imageHandling: boolean;
    privacyTerms: boolean;
    marketingOptIn: boolean;
  };
  internalNote: string;
  deposit: {
    amountClp: number;
    method: string;
    paidAt: string;
    reference: string | null;
    verified: boolean;
    verifiedAt: string | null;
  } | null;
  referenceImages: {
    id: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    accessUrl: string | null;
  }[];
  referenceUrls: string[];
};

type RecentPurchaseRequest = {
  id: string;
  purchaseCode: string;
  createdAt: string | null;
  customerName: string;
  phone: string;
  email: string | null;
  productCode: string;
  productTitle: string;
  priceClp: number;
  status: string;
  whatsappUrl: string | null;
};

type AdminCalendarDateStatus =
  | "AVAILABLE"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "BLOCKED_BY_ADMIN";

type AdminCalendarDate = {
  date: string;
  status: AdminCalendarDateStatus;
};

type DepositDraft = {
  amountClp: string;
  method: string;
  paidAt: string;
  reference: string;
  internalNote: string;
};

const quoteStatuses = ["pending", "contacted", "closed", "spam"] as const;

const quoteStatusLabels: Record<(typeof quoteStatuses)[number], string> = {
  pending: "Pendiente",
  contacted: "Contactado",
  closed: "Cerrado",
  spam: "Spam",
};

function formatDate(value: string | null) {
  if (!value) {
    return "sin fecha";
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPreferredDate(value: string | null) {
  if (!value) {
    return "sin fecha preferida";
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeZone: "America/Santiago",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function formatCalendarDateStatus(value: string | null) {
  const labels: Record<string, string> = {
    PENDING_CONFIRMATION: "pendiente de confirmación",
    DEPOSIT_PENDING: "abono pendiente",
    DEPOSIT_VERIFIED: "abono verificado",
    CONFIRMED: "confirmada",
    BLOCKED_BY_ADMIN: "bloqueada por admin",
    CANCELLED: "cancelada",
    RELEASED: "liberada",
  };

  return value ? (labels[value] ?? value) : "sin bloqueo de calendario";
}

const adminCalendarStatusLabels: Record<AdminCalendarDateStatus, string> = {
  AVAILABLE: "Disponible",
  PENDING_CONFIRMATION: "Pendiente",
  CONFIRMED: "Confirmada",
  BLOCKED_BY_ADMIN: "Bloqueada por admin",
};

const adminCalendarStatusClasses: Record<AdminCalendarDateStatus, string> = {
  AVAILABLE: "border-emerald-400/40 bg-emerald-400/10 text-emerald-100",
  PENDING_CONFIRMATION: "border-amber-300/50 bg-amber-300/10 text-amber-100",
  CONFIRMED: "border-sky-300/50 bg-sky-300/10 text-sky-100",
  BLOCKED_BY_ADMIN: "border-red-300/50 bg-red-300/10 text-red-100",
};

function getCurrentLocalMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatCalendarDay(date: string) {
  return String(Number(date.slice(8, 10)));
}

function getEmptyDepositDraft(): DepositDraft {
  return { amountClp: "", method: "transferencia", paidAt: "", reference: "", internalNote: "" };
}

function getStatusCalendarHint(quote: RecentQuoteRequest, nextStatus: string) {
  if (!quote.preferredTattooDate || quote.calendarDateStatus !== "PENDING_CONFIRMATION") {
    return "";
  }

  if (nextStatus === "spam" || nextStatus === "closed") {
    return " Este cambio liberará la fecha preferida si sigue asociada a esta cotización.";
  }

  if (nextStatus === "contacted") {
    return " La fecha preferida seguirá pendiente mientras coordinas con el cliente.";
  }

  return "";
}

function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "sin tamaño";
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AdminStatusPanel({
  initialStatus,
  imageUploadsEnabled = false,
}: {
  initialStatus: AdminStatusResponse;
  imageUploadsEnabled?: boolean;
}) {
  const { user } = useAuth();
  const [status, setStatus] = useState<AdminStatusResponse | null>(initialStatus);
  const [quotes, setQuotes] = useState<RecentQuoteRequest[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<RecentPurchaseRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingQuoteId, setUpdatingQuoteId] = useState<string | null>(null);
  const [savingNoteQuoteId, setSavingNoteQuoteId] = useState<string | null>(null);
  const [savingDepositQuoteId, setSavingDepositQuoteId] = useState<string | null>(null);
  const [calendarDateDraft, setCalendarDateDraft] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(getCurrentLocalMonth());
  const [calendarDates, setCalendarDates] = useState<AdminCalendarDate[]>([]);
  const [selectedCalendarDates, setSelectedCalendarDates] = useState<string[]>([]);
  const [updatingCalendarDate, setUpdatingCalendarDate] = useState(false);
  const [updatingPurchaseRequestId, setUpdatingPurchaseRequestId] = useState<string | null>(null);
  const [confirmingReservationQuoteId, setConfirmingReservationQuoteId] = useState<string | null>(
    null,
  );
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [depositDrafts, setDepositDrafts] = useState<Record<string, DepositDraft>>({});
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const directImageEntries = quotes.flatMap((quote) =>
      quote.referenceImages.flatMap((image) =>
        image.accessUrl?.startsWith("https://") ? [[image.id, image.accessUrl] as const] : [],
      ),
    );
    const imageRequests = quotes.flatMap((quote) =>
      quote.referenceImages
        .filter((image) => image.accessUrl && !image.accessUrl.startsWith("https://"))
        .map((image) => ({ id: image.id, accessUrl: image.accessUrl as string })),
    );

    if (!user || imageRequests.length === 0) {
      void Promise.resolve().then(() =>
        setImagePreviewUrls(Object.fromEntries(directImageEntries)),
      );
      return;
    }

    const currentUser = user;
    let cancelled = false;
    const objectUrls: string[] = [];

    async function loadImagePreviews() {
      try {
        setImagePreviewUrls(Object.fromEntries(directImageEntries));
        const idToken = await currentUser.getIdToken();
        const loadedEntries = await Promise.all(
          imageRequests.map(async (image) => {
            const response = await fetch(image.accessUrl, {
              headers: { Authorization: `Bearer ${idToken}` },
            });

            if (!response.ok) {
              throw new Error("Image proxy request failed.");
            }

            const objectUrl = URL.createObjectURL(await response.blob());
            objectUrls.push(objectUrl);
            return [image.id, objectUrl] as const;
          }),
        );

        if (cancelled) {
          objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
        } else {
          setImagePreviewUrls(Object.fromEntries([...directImageEntries, ...loadedEntries]));
        }
      } catch {
        if (!cancelled) {
          setImagePreviewUrls(Object.fromEntries(directImageEntries));
        }
      }
    }

    void loadImagePreviews();

    return () => {
      cancelled = true;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [quotes, user]);

  async function checkServerStatus() {
    if (!user) {
      setError("Inicia sesión antes de validar el rol en el servidor.");
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/status", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = (await response.json()) as AdminStatusResponse;

      setStatus(body);
      if (!response.ok) {
        setError("El servidor no pudo validar un perfil con rol permitido.");
        setQuotes([]);
        setPurchaseRequests([]);
        return;
      }

      if (!body.admin) {
        setError("El perfil autenticado no tiene rol admin en el servidor.");
        setQuotes([]);
        setPurchaseRequests([]);
        return;
      }

      const sessionResponse = await fetch("/api/admin/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!sessionResponse.ok) {
        setError("El servidor validó el rol, pero no pudo crear la sesión admin segura.");
        setQuotes([]);
        setPurchaseRequests([]);
        return;
      }

      const [quotesResponse, purchaseRequestsResponse] = await Promise.all([
        fetch("/api/admin/quotes", {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
        }),
        fetch("/api/admin/purchase-requests", {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
        }),
      ]);
      const quotesBody = (await quotesResponse.json()) as { quotes?: RecentQuoteRequest[] };
      const purchaseRequestsBody = (await purchaseRequestsResponse.json()) as {
        purchaseRequests?: RecentPurchaseRequest[];
      };

      if (!quotesResponse.ok) {
        setError("El servidor no pudo listar solicitudes de cotización.");
        setQuotes([]);
        setPurchaseRequests([]);
        return;
      }

      if (!purchaseRequestsResponse.ok) {
        setError("El servidor no pudo listar solicitudes de compra.");
        setQuotes([]);
        setPurchaseRequests([]);
        return;
      }

      const nextQuotes = quotesBody.quotes ?? [];
      setQuotes(nextQuotes);
      setPurchaseRequests(purchaseRequestsBody.purchaseRequests ?? []);
      setNoteDrafts(
        Object.fromEntries(nextQuotes.map((quote) => [quote.id, quote.internalNote ?? ""])),
      );
      setDepositDrafts(
        Object.fromEntries(nextQuotes.map((quote) => [quote.id, getEmptyDepositDraft()])),
      );
    } catch {
      setError("No se pudo consultar el estado de admin en el servidor.");
      setQuotes([]);
      setPurchaseRequests([]);
    } finally {
      setLoading(false);
    }
  }

  async function saveQuoteDeposit(quote: RecentQuoteRequest) {
    if (!user) {
      setError("Inicia sesión antes de registrar un abono.");
      return;
    }

    const draft = depositDrafts[quote.id] ?? getEmptyDepositDraft();
    setSavingDepositQuoteId(quote.id);
    setError(null);
    setNotice(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/quotes/deposit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quoteId: quote.id, deposit: draft }),
      });
      const body = (await response.json()) as {
        error?: string;
        errors?: Record<string, string>;
        deposit?: RecentQuoteRequest["deposit"];
        calendarDateStatus?: string | null;
      };

      if (!response.ok || !body.deposit) {
        setError(
          body.error ?? Object.values(body.errors ?? {})[0] ?? "No se pudo registrar el abono.",
        );
        return;
      }

      setQuotes((currentQuotes) =>
        currentQuotes.map((currentQuote) =>
          currentQuote.id === quote.id
            ? {
                ...currentQuote,
                deposit: body.deposit ?? currentQuote.deposit,
                calendarDateStatus: body.calendarDateStatus ?? currentQuote.calendarDateStatus,
              }
            : currentQuote,
        ),
      );
      setNotice("Abono verificado y registrado desde ruta server-side con rol admin validado.");
    } catch {
      setError("No se pudo conectar con la ruta server-side de abonos.");
    } finally {
      setSavingDepositQuoteId(null);
    }
  }

  async function confirmReservation(quote: RecentQuoteRequest) {
    if (!user) {
      setError("Inicia sesión antes de confirmar una reserva.");
      return;
    }

    setConfirmingReservationQuoteId(quote.id);
    setError(null);
    setNotice(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/quotes/confirm-reservation", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quoteId: quote.id }),
      });
      const body = (await response.json()) as { error?: string; calendarDateStatus?: string };

      if (!response.ok || body.calendarDateStatus !== "CONFIRMED") {
        setError(body.error ?? "No se pudo confirmar la reserva.");
        return;
      }

      setQuotes((currentQuotes) =>
        currentQuotes.map((currentQuote) =>
          currentQuote.id === quote.id
            ? { ...currentQuote, calendarDateStatus: body.calendarDateStatus ?? "CONFIRMED" }
            : currentQuote,
        ),
      );
      setNotice("Reserva confirmada con abono verificado.");
    } catch {
      setError("No se pudo conectar con la ruta server-side de confirmación.");
    } finally {
      setConfirmingReservationQuoteId(null);
    }
  }

  async function saveQuoteInternalNote(quoteId: string) {
    if (!user) {
      setError("Inicia sesión antes de guardar una nota interna.");
      return;
    }

    setSavingNoteQuoteId(quoteId);
    setError(null);
    setNotice(null);

    try {
      const idToken = await user.getIdToken();
      const internalNote = noteDrafts[quoteId] ?? "";
      const response = await fetch("/api/admin/quotes/note", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quoteId, internalNote }),
      });
      const body = (await response.json()) as { error?: string; internalNote?: string };

      if (!response.ok || body.internalNote === undefined) {
        setError(body.error ?? "No se pudo guardar la nota interna.");
        return;
      }

      setQuotes((currentQuotes) =>
        currentQuotes.map((quote) =>
          quote.id === quoteId ? { ...quote, internalNote: body.internalNote ?? "" } : quote,
        ),
      );
      setNoteDrafts((currentDrafts) => ({ ...currentDrafts, [quoteId]: body.internalNote ?? "" }));
      setNotice("Nota interna guardada desde ruta server-side con rol admin validado.");
    } catch {
      setError("No se pudo conectar con la ruta server-side de notas internas.");
    } finally {
      setSavingNoteQuoteId(null);
    }
  }

  async function updateQuoteStatus(quote: RecentQuoteRequest, status: string) {
    if (!user) {
      setError("Inicia sesión antes de cambiar el estado.");
      return;
    }

    const calendarHint = getStatusCalendarHint(quote, status);
    setUpdatingQuoteId(quote.id);
    setError(null);
    setNotice(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/quotes/status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quoteId: quote.id, status }),
      });
      const body = (await response.json()) as {
        error?: string;
        status?: string;
        calendarDateStatus?: string | null;
      };

      if (!response.ok || !body.status) {
        setError(body.error ?? "No se pudo actualizar el estado de la solicitud.");
        return;
      }

      setQuotes((currentQuotes) =>
        currentQuotes.map((currentQuote) =>
          currentQuote.id === quote.id
            ? {
                ...currentQuote,
                status: body.status ?? currentQuote.status,
                calendarDateStatus: body.calendarDateStatus ?? currentQuote.calendarDateStatus,
              }
            : currentQuote,
        ),
      );
      setNotice(`Estado actualizado desde ruta server-side con rol admin validado.${calendarHint}`);
    } catch {
      setError("No se pudo conectar con la ruta server-side de actualización.");
    } finally {
      setUpdatingQuoteId(null);
    }
  }

  async function updatePurchaseRequestStatus(request: RecentPurchaseRequest, status: string) {
    if (!user) {
      setError("Inicia sesión antes de cambiar el estado de compra.");
      return;
    }

    setUpdatingPurchaseRequestId(request.id);
    setError(null);
    setNotice(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/purchase-requests/status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ purchaseRequestId: request.id, status }),
      });
      const body = (await response.json()) as { error?: string; status?: string };

      if (!response.ok || !body.status) {
        setError(body.error ?? "No se pudo actualizar el estado de compra.");
        return;
      }

      setPurchaseRequests((currentRequests) =>
        currentRequests.map((currentRequest) =>
          currentRequest.id === request.id
            ? { ...currentRequest, status: body.status ?? currentRequest.status }
            : currentRequest,
        ),
      );
      setNotice("Estado de compra actualizado desde ruta server-side con rol admin validado.");
    } catch {
      setError("No se pudo conectar con la ruta server-side de compras.");
    } finally {
      setUpdatingPurchaseRequestId(null);
    }
  }

  async function loadAdminCalendarMonth(month = calendarMonth) {
    if (!user) return;

    setUpdatingCalendarDate(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/calendar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "list", month }),
      });
      const body = (await response.json()) as { dates?: AdminCalendarDate[]; error?: string };

      if (!response.ok) {
        setError(body.error ?? "No se pudo cargar el calendario admin.");
        setCalendarDates([]);
        return;
      }

      setCalendarDates(body.dates ?? []);
      setSelectedCalendarDates([]);
    } catch {
      setError("No se pudo conectar con la ruta server-side de calendario.");
      setCalendarDates([]);
    } finally {
      setUpdatingCalendarDate(false);
    }
  }

  function toggleSelectedCalendarDate(date: string) {
    setSelectedCalendarDates((currentDates) =>
      currentDates.includes(date)
        ? currentDates.filter((currentDate) => currentDate !== date)
        : [...currentDates, date].sort(),
    );
  }

  async function bulkUpdateAdminCalendarDates(action: "bulkBlock" | "bulkUnblock") {
    if (!user) {
      setError("Inicia sesión antes de modificar el calendario.");
      return;
    }

    setUpdatingCalendarDate(true);
    setError(null);
    setNotice(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/calendar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, dates: selectedCalendarDates }),
      });
      const body = (await response.json()) as {
        error?: string;
        updated?: string[];
        skipped?: { date: string; error: string }[];
      };

      if (!response.ok) {
        setError(body.error ?? "No se pudo actualizar el calendario.");
        return;
      }

      setNotice(
        `${body.updated?.length ?? 0} fecha(s) actualizada(s). ${body.skipped?.length ?? 0} fecha(s) protegida(s) no se modificaron.`,
      );
      await loadAdminCalendarMonth(calendarMonth);
    } catch {
      setError("No se pudo conectar con la ruta server-side de calendario.");
    } finally {
      setUpdatingCalendarDate(false);
    }
  }

  async function updateAdminCalendarDate(action: "block" | "unblock") {
    if (!user) {
      setError("Inicia sesión antes de modificar el calendario.");
      return;
    }

    setUpdatingCalendarDate(true);
    setError(null);
    setNotice(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/calendar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, date: calendarDateDraft }),
      });
      const body = (await response.json()) as {
        error?: string;
        date?: string;
        calendarDateStatus?: string;
      };

      if (!response.ok || !body.date) {
        setError(body.error ?? "No se pudo actualizar la fecha del calendario.");
        return;
      }

      setNotice(
        action === "block"
          ? `Fecha ${body.date} marcada como no disponible.`
          : `Fecha ${body.date} liberada si estaba bloqueada manualmente.`,
      );
      await loadAdminCalendarMonth(calendarMonth);
    } catch {
      setError("No se pudo conectar con la ruta server-side de calendario.");
    } finally {
      setUpdatingCalendarDate(false);
    }
  }

  return (
    <div className="space-y-5 rounded-3xl border border-stone-700 bg-stone-950/70 p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
          Operaciones
        </p>
        <h1 className="mt-3 text-3xl font-black text-stone-50">Dashboard admin local</h1>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          Valida el token contra servidor, revisa cotizaciones recientes y actualiza estados sin
          abrir escrituras cliente en Firestore.
        </p>
      </div>

      <LoginPanel
        onSessionCleared={() => {
          setStatus({ authenticated: false, admin: false, profile: null });
          setQuotes([]);
          setPurchaseRequests([]);
        }}
        onSessionEstablished={setStatus}
      />

      <button
        className="rounded-full bg-amber-300 px-5 py-2 font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!user || loading}
        onClick={checkServerStatus}
        type="button"
      >
        {loading ? "Validando…" : "Validar rol en servidor"}
      </button>

      {status ? (
        <div className="grid gap-3 rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-sm text-stone-200 sm:grid-cols-2">
          <p>Autenticado: {status.authenticated ? "sí" : "no"}</p>
          <p>Admin server-side: {status.admin ? "sí" : "no"}</p>
          <p>Rol servidor: {status.profile?.role ?? "sin perfil válido"}</p>
          <p>Usuario: {status.profile?.email ?? status.profile?.uid ?? "n/a"}</p>
        </div>
      ) : null}

      {status?.configurationMessage ? (
        <p className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4 text-sm text-amber-100">
          {status.configurationMessage}
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}

      {status?.admin ? (
        <div className="space-y-5">
          <AdminPortfolioPanel enabled={status.admin} fileUploadsEnabled={imageUploadsEnabled} />

          <section className="space-y-3 rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
            <div>
              <h3 className="text-xl font-bold text-stone-50">Solicitudes de compra recientes</h3>
              <p className="mt-1 text-sm text-stone-400">
                MVP de seguimiento para obras disponibles. La compra se coordina manualmente; no hay
                pagos en línea.
              </p>
            </div>
            {purchaseRequests.length === 0 ? (
              <p className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4 text-sm text-stone-400">
                Todavía no hay solicitudes de compra.
              </p>
            ) : (
              <ul className="space-y-3">
                {purchaseRequests.map((request) => (
                  <li
                    className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4"
                    key={request.id}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-stone-100">{request.customerName}</p>
                        <p className="font-mono text-xs text-amber-200">{request.purchaseCode}</p>
                        <p className="text-sm text-stone-400">
                          {request.phone}
                          {request.email ? ` · ${request.email}` : ""}
                        </p>
                      </div>
                      <div className="text-sm text-stone-400 sm:text-right">
                        <p>{formatDate(request.createdAt)}</p>
                        <p>
                          Estado:{" "}
                          {purchaseRequestStatusLabels[
                            request.status as keyof typeof purchaseRequestStatusLabels
                          ] ?? request.status}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-stone-300">
                      <p>
                        <span className="font-semibold text-stone-100">Obra:</span>{" "}
                        {request.productTitle} ({request.productCode})
                      </p>
                      <p>
                        <span className="font-semibold text-stone-100">Precio:</span>{" "}
                        {formatClpPrice(request.priceClp)}
                      </p>
                    </div>
                    {request.whatsappUrl ? (
                      <a
                        className="mt-3 inline-flex rounded-full border border-emerald-300/50 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-300 hover:text-stone-950"
                        href={request.whatsappUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Abrir WhatsApp
                      </a>
                    ) : null}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                        Estado de compra
                      </label>
                      <select
                        className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={updatingPurchaseRequestId === request.id}
                        onChange={(event) =>
                          updatePurchaseRequestStatus(request, event.target.value)
                        }
                        value={request.status}
                      >
                        {purchaseRequestStatuses.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {purchaseRequestStatusLabels[statusOption]}
                          </option>
                        ))}
                      </select>
                      {updatingPurchaseRequestId === request.id ? (
                        <span className="text-sm text-stone-400">Actualizando…</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
            <div>
              <h3 className="text-xl font-bold text-stone-50">Calendario de disponibilidad</h3>
              <p className="mt-1 text-sm text-stone-400">
                Bloquea fechas no disponibles para el público. La acción server-side no sobrescribe
                fechas asociadas a cotizaciones o reservas.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={updatingCalendarDate}
                onChange={(event) => setCalendarDateDraft(event.target.value)}
                type="date"
                value={calendarDateDraft}
              />
              <button
                className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!calendarDateDraft || updatingCalendarDate}
                onClick={() => updateAdminCalendarDate("block")}
                type="button"
              >
                Bloquear fecha
              </button>
              <button
                className="rounded-full border border-stone-500 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-stone-100 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!calendarDateDraft || updatingCalendarDate}
                onClick={() => updateAdminCalendarDate("unblock")}
                type="button"
              >
                Liberar bloqueo admin
              </button>
            </div>
            <div className="space-y-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="grid gap-1 text-sm font-semibold text-stone-200">
                  Mes del calendario
                  <input
                    className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={updatingCalendarDate}
                    onChange={(event) => setCalendarMonth(event.target.value)}
                    type="month"
                    value={calendarMonth}
                  />
                </label>
                <button
                  className="rounded-full border border-stone-500 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-stone-100 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!calendarMonth || updatingCalendarDate}
                  onClick={() => loadAdminCalendarMonth(calendarMonth)}
                  type="button"
                >
                  {updatingCalendarDate ? "Cargando…" : "Cargar mes"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-stone-300">
                {Object.entries(adminCalendarStatusLabels).map(([statusKey, label]) => (
                  <span
                    className={`rounded-full border px-3 py-1 ${adminCalendarStatusClasses[statusKey as AdminCalendarDateStatus]}`}
                    key={statusKey}
                  >
                    {label}
                  </span>
                ))}
              </div>
              {calendarDates.length > 0 ? (
                <div className="grid grid-cols-7 gap-2">
                  {calendarDates.map((calendarDate) => {
                    const selected = selectedCalendarDates.includes(calendarDate.date);

                    return (
                      <button
                        className={`min-h-20 rounded-2xl border p-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${adminCalendarStatusClasses[calendarDate.status]} ${selected ? "ring-2 ring-amber-200" : ""}`}
                        disabled={updatingCalendarDate}
                        key={calendarDate.date}
                        onClick={() => toggleSelectedCalendarDate(calendarDate.date)}
                        type="button"
                      >
                        <span className="block text-lg font-black">
                          {formatCalendarDay(calendarDate.date)}
                        </span>
                        <span className="mt-1 block leading-4">
                          {adminCalendarStatusLabels[calendarDate.status]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-stone-800 p-3 text-sm text-stone-400">
                  Carga un mes para seleccionar varias fechas y bloquearlas o liberarlas en lote.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-stone-400">
                  {selectedCalendarDates.length} fecha(s) seleccionada(s)
                </span>
                <button
                  className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={selectedCalendarDates.length === 0 || updatingCalendarDate}
                  onClick={() => bulkUpdateAdminCalendarDates("bulkBlock")}
                  type="button"
                >
                  Bloquear selección
                </button>
                <button
                  className="rounded-full border border-stone-500 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-stone-100 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={selectedCalendarDates.length === 0 || updatingCalendarDate}
                  onClick={() => bulkUpdateAdminCalendarDates("bulkUnblock")}
                  type="button"
                >
                  Liberar bloqueos seleccionados
                </button>
              </div>
              <p className="text-xs leading-5 text-stone-500">
                La vista no muestra datos personales. Las fechas pendientes o confirmadas por
                cotización quedan protegidas y no se sobrescriben con bloqueos manuales.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-xl font-bold text-stone-50">Solicitudes recientes</h3>
              <p className="mt-1 text-sm text-stone-400">
                Esta lista viene de una ruta server-side que vuelve a validar el ID token y el rol
                admin.
              </p>
            </div>
            {quotes.length === 0 ? (
              <p className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-sm text-stone-400">
                Todavía no hay solicitudes locales.
              </p>
            ) : (
              <ul className="space-y-3">
                {quotes.map((quote) => (
                  <li
                    key={quote.id}
                    className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-stone-100">{quote.customerName}</p>
                        <p className="font-mono text-xs text-amber-200">{quote.quoteCode}</p>
                        <p className="text-sm text-stone-400">
                          {quote.email}
                          {quote.phone ? ` · ${quote.phone}` : ""} · {quote.preferredContactMethod}
                        </p>
                      </div>
                      <div className="text-sm text-stone-400 sm:text-right">
                        <p>{formatDate(quote.createdAt)}</p>
                        <p>Estado: {quote.status}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-stone-300 md:grid-cols-2">
                      <p>
                        <span className="font-semibold text-stone-100">Zona:</span>{" "}
                        {quote.bodyPlacement}
                      </p>
                      <p>
                        <span className="font-semibold text-stone-100">Tamaño:</span>{" "}
                        {quote.approximateSize}
                      </p>
                      <p>
                        <span className="font-semibold text-stone-100">Presupuesto:</span>{" "}
                        {quote.budgetClp
                          ? `$${quote.budgetClp.toLocaleString("es-CL")}`
                          : "sin dato"}
                      </p>
                      <p>
                        <span className="font-semibold text-stone-100">Contacto preferido:</span>{" "}
                        {quote.preferredContactMethod}
                      </p>
                      <p>
                        <span className="font-semibold text-stone-100">Fecha preferida:</span>{" "}
                        {formatPreferredDate(quote.preferredTattooDate)} ·{" "}
                        {formatCalendarDateStatus(quote.calendarDateStatus)}
                      </p>
                      <p>
                        <span className="font-semibold text-stone-100">Marketing/comunidad:</span>{" "}
                        {quote.consents.marketingOptIn ? "aceptado" : "no aceptado"}
                      </p>
                    </div>
                    <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/70 p-3 text-sm text-stone-300">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                        Consentimientos
                      </p>
                      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                        <li>
                          Datos para cotización: {quote.consents.dataProcessing ? "sí" : "no"}
                        </li>
                        <li>
                          Manejo privado de imágenes: {quote.consents.imageHandling ? "sí" : "no"}
                        </li>
                        <li>Privacidad y reserva: {quote.consents.privacyTerms ? "sí" : "no"}</li>
                        <li>Marketing/comunidad: {quote.consents.marketingOptIn ? "sí" : "no"}</li>
                      </ul>
                    </div>
                    <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                        Descripción completa
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-300">
                        {quote.description || quote.descriptionPreview || "Sin descripción."}
                      </p>
                    </div>
                    {quote.referenceUrls.length > 0 ? (
                      <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                          Enlaces de referencia
                        </p>
                        <ul className="mt-2 space-y-2 text-sm">
                          {quote.referenceUrls.map((referenceUrl) => (
                            <li className="break-all" key={referenceUrl}>
                              <a
                                className="font-semibold text-amber-200 underline underline-offset-4"
                                href={referenceUrl}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                {referenceUrl}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {quote.referenceImages.length > 0 ? (
                      <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                          Imágenes de referencia
                        </p>
                        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                          {quote.referenceImages.map((image) => (
                            <li className="space-y-2" key={image.id}>
                              {imagePreviewUrls[image.id] ? (
                                <a
                                  href={imagePreviewUrls[image.id]}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    alt={`Referencia ${image.originalFilename}`}
                                    className="h-32 w-full rounded-lg object-cover"
                                    src={imagePreviewUrls[image.id]}
                                  />
                                </a>
                              ) : (
                                <div className="flex h-32 items-center justify-center rounded-lg border border-stone-800 text-xs text-stone-500">
                                  Preview privada disponible al validar admin.
                                </div>
                              )}
                              <p className="break-all text-xs text-stone-400">
                                {image.originalFilename} · {formatFileSize(image.sizeBytes)}
                              </p>
                              {imagePreviewUrls[image.id] ? (
                                <a
                                  className="text-xs font-semibold text-amber-200 underline underline-offset-4"
                                  href={imagePreviewUrls[image.id]}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  Abrir imagen
                                </a>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        className="rounded-full border border-amber-300/50 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-300 hover:text-stone-950"
                        href={buildQuoteMailtoUrl(quote)}
                      >
                        Enviar email
                      </a>
                      {buildQuoteWhatsAppUrl(quote) ? (
                        <a
                          className="rounded-full border border-emerald-300/50 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-300 hover:text-stone-950"
                          href={buildQuoteWhatsAppUrl(quote) ?? undefined}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Abrir WhatsApp
                        </a>
                      ) : null}
                    </div>
                    <div className="mt-4 space-y-2">
                      <label
                        className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500"
                        htmlFor={`note-${quote.id}`}
                      >
                        Nota interna
                      </label>
                      <textarea
                        className="min-h-28 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={savingNoteQuoteId === quote.id}
                        id={`note-${quote.id}`}
                        maxLength={2000}
                        onChange={(event) =>
                          setNoteDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [quote.id]: event.target.value,
                          }))
                        }
                        placeholder="Notas privadas para seguimiento del estudio."
                        value={noteDrafts[quote.id] ?? quote.internalNote ?? ""}
                      />
                      <div className="flex items-center gap-3">
                        <button
                          className="rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={savingNoteQuoteId === quote.id}
                          onClick={() => saveQuoteInternalNote(quote.id)}
                          type="button"
                        >
                          {savingNoteQuoteId === quote.id ? "Guardando…" : "Guardar nota"}
                        </button>
                        <span className="text-xs text-stone-500">
                          {(noteDrafts[quote.id] ?? "").length}/2000
                        </span>
                      </div>
                    </div>
                    {quote.preferredTattooDate &&
                    quote.calendarDateStatus === "PENDING_CONFIRMATION" ? (
                      <div className="mt-4 space-y-3 rounded-xl border border-amber-300/30 bg-amber-950/20 p-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                            Abono manual
                          </p>
                          {quote.deposit?.verified ? (
                            <p className="mt-1 text-sm text-stone-300">
                              Verificado: ${quote.deposit.amountClp.toLocaleString("es-CL")} vía{" "}
                              {quote.deposit.method} el {formatPreferredDate(quote.deposit.paidAt)}
                              {quote.deposit.reference ? ` · Ref. ${quote.deposit.reference}` : ""}
                            </p>
                          ) : (
                            <p className="mt-1 text-sm text-stone-400">
                              Registra el abono recibido antes de confirmar la reserva.
                            </p>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={savingDepositQuoteId === quote.id}
                            inputMode="numeric"
                            onChange={(event) =>
                              setDepositDrafts((currentDrafts) => ({
                                ...currentDrafts,
                                [quote.id]: {
                                  ...(currentDrafts[quote.id] ?? getEmptyDepositDraft()),
                                  amountClp: event.target.value,
                                },
                              }))
                            }
                            placeholder="Monto CLP"
                            value={depositDrafts[quote.id]?.amountClp ?? ""}
                          />
                          <input
                            className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={savingDepositQuoteId === quote.id}
                            onChange={(event) =>
                              setDepositDrafts((currentDrafts) => ({
                                ...currentDrafts,
                                [quote.id]: {
                                  ...(currentDrafts[quote.id] ?? getEmptyDepositDraft()),
                                  method: event.target.value,
                                },
                              }))
                            }
                            placeholder="Método"
                            value={depositDrafts[quote.id]?.method ?? "transferencia"}
                          />
                          <input
                            className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={savingDepositQuoteId === quote.id}
                            onChange={(event) =>
                              setDepositDrafts((currentDrafts) => ({
                                ...currentDrafts,
                                [quote.id]: {
                                  ...(currentDrafts[quote.id] ?? getEmptyDepositDraft()),
                                  paidAt: event.target.value,
                                },
                              }))
                            }
                            type="date"
                            value={depositDrafts[quote.id]?.paidAt ?? ""}
                          />
                          <input
                            className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={savingDepositQuoteId === quote.id}
                            onChange={(event) =>
                              setDepositDrafts((currentDrafts) => ({
                                ...currentDrafts,
                                [quote.id]: {
                                  ...(currentDrafts[quote.id] ?? getEmptyDepositDraft()),
                                  reference: event.target.value,
                                },
                              }))
                            }
                            placeholder="Referencia opcional"
                            value={depositDrafts[quote.id]?.reference ?? ""}
                          />
                        </div>
                        <textarea
                          className="min-h-20 w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={savingDepositQuoteId === quote.id}
                          onChange={(event) =>
                            setDepositDrafts((currentDrafts) => ({
                              ...currentDrafts,
                              [quote.id]: {
                                ...(currentDrafts[quote.id] ?? getEmptyDepositDraft()),
                                internalNote: event.target.value,
                              },
                            }))
                          }
                          placeholder="Nota interna opcional del abono. No se muestra públicamente."
                          value={depositDrafts[quote.id]?.internalNote ?? ""}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={savingDepositQuoteId === quote.id}
                            onClick={() => saveQuoteDeposit(quote)}
                            type="button"
                          >
                            {savingDepositQuoteId === quote.id ? "Guardando…" : "Registrar abono"}
                          </button>
                          <button
                            className="rounded-full border border-emerald-300/50 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-300 hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={
                              !quote.deposit?.verified || confirmingReservationQuoteId === quote.id
                            }
                            onClick={() => confirmReservation(quote)}
                            type="button"
                          >
                            {confirmingReservationQuoteId === quote.id
                              ? "Confirmando…"
                              : "Confirmar reserva"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                        Estado interno
                      </label>
                      <select
                        className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={updatingQuoteId === quote.id}
                        onChange={(event) => updateQuoteStatus(quote, event.target.value)}
                        value={quote.status}
                      >
                        {quoteStatuses.map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {quoteStatusLabels[statusOption]}
                          </option>
                        ))}
                      </select>
                      {updatingQuoteId === quote.id ? (
                        <span className="text-sm text-stone-400">Actualizando…</span>
                      ) : null}
                    </div>
                    {quote.preferredTattooDate &&
                    quote.calendarDateStatus === "PENDING_CONFIRMATION" ? (
                      <p className="mt-2 text-xs leading-5 text-stone-400">
                        Contactado mantiene la fecha pendiente. Cerrado o Spam liberan la fecha solo
                        si todavía pertenece a esta cotización; no se marca como confirmada sin una
                        reserva explícita.
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
