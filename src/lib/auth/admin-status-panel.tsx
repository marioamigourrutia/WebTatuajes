"use client";

import { useEffect, useState } from "react";
import { LoginPanel } from "@/lib/auth/login-panel";
import { useAuth } from "@/lib/auth/auth-context";
import { buildQuoteMailtoUrl, buildQuoteWhatsAppUrl } from "@/lib/quotes/contact-links";

type AdminStatusResponse = {
  authenticated: boolean;
  admin: boolean;
  profile: { uid: string; email: string | null; role: string } | null;
};

type RecentQuoteRequest = {
  id: string;
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
  internalNote: string;
  referenceImages: {
    id: string;
    storagePath: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    accessUrl: string | null;
  }[];
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

function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "sin tamaño";
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AdminStatusPanel() {
  const { user } = useAuth();
  const [status, setStatus] = useState<AdminStatusResponse | null>(null);
  const [quotes, setQuotes] = useState<RecentQuoteRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingQuoteId, setUpdatingQuoteId] = useState<string | null>(null);
  const [savingNoteQuoteId, setSavingNoteQuoteId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const imageRequests = quotes.flatMap((quote) =>
      quote.referenceImages
        .filter((image) => image.accessUrl)
        .map((image) => ({ id: image.id, accessUrl: image.accessUrl as string })),
    );

    if (!user || imageRequests.length === 0) {
      void Promise.resolve().then(() => setImagePreviewUrls({}));
      return;
    }

    const currentUser = user;
    let cancelled = false;
    const objectUrls: string[] = [];

    async function loadImagePreviews() {
      try {
        setImagePreviewUrls({});
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
          setImagePreviewUrls(Object.fromEntries(loadedEntries));
        }
      } catch {
        if (!cancelled) {
          setImagePreviewUrls({});
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
      setError("Iniciá sesión antes de validar el rol en el servidor.");
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
        return;
      }

      if (!body.admin) {
        setError("El perfil autenticado no tiene rol admin en el servidor.");
        setQuotes([]);
        return;
      }

      const quotesResponse = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const quotesBody = (await quotesResponse.json()) as { quotes?: RecentQuoteRequest[] };

      if (!quotesResponse.ok) {
        setError("El servidor no pudo listar solicitudes de cotización.");
        setQuotes([]);
        return;
      }

      const nextQuotes = quotesBody.quotes ?? [];
      setQuotes(nextQuotes);
      setNoteDrafts(
        Object.fromEntries(nextQuotes.map((quote) => [quote.id, quote.internalNote ?? ""])),
      );
    } catch {
      setError("No se pudo consultar el estado de admin en el servidor.");
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }

  async function saveQuoteInternalNote(quoteId: string) {
    if (!user) {
      setError("Iniciá sesión antes de guardar una nota interna.");
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

  async function updateQuoteStatus(quoteId: string, status: string) {
    if (!user) {
      setError("Iniciá sesión antes de cambiar el estado.");
      return;
    }

    setUpdatingQuoteId(quoteId);
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
        body: JSON.stringify({ quoteId, status }),
      });
      const body = (await response.json()) as { error?: string; status?: string };

      if (!response.ok || !body.status) {
        setError(body.error ?? "No se pudo actualizar el estado de la solicitud.");
        return;
      }

      setQuotes((currentQuotes) =>
        currentQuotes.map((quote) =>
          quote.id === quoteId ? { ...quote, status: body.status ?? quote.status } : quote,
        ),
      );
      setNotice("Estado actualizado desde ruta server-side con rol admin validado.");
    } catch {
      setError("No se pudo conectar con la ruta server-side de actualización.");
    } finally {
      setUpdatingQuoteId(null);
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
          Validá el token contra servidor, revisá cotizaciones recientes y actualizá estados sin
          abrir escrituras cliente en Firestore.
        </p>
      </div>

      <LoginPanel />

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

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}

      {status?.admin ? (
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
                      {quote.budgetClp ? `$${quote.budgetClp.toLocaleString("es-CL")}` : "sin dato"}
                    </p>
                    <p>
                      <span className="font-semibold text-stone-100">Contacto preferido:</span>{" "}
                      {quote.preferredContactMethod}
                    </p>
                  </div>
                  <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Descripción completa
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-300">
                      {quote.description || quote.descriptionPreview || "Sin descripción."}
                    </p>
                  </div>
                  {quote.referenceImages.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                        Imágenes de referencia
                      </p>
                      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                        {quote.referenceImages.map((image) => (
                          <li className="space-y-2" key={image.id}>
                            {imagePreviewUrls[image.id] ? (
                              <a href={imagePreviewUrls[image.id]} rel="noreferrer" target="_blank">
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
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Estado interno
                    </label>
                    <select
                      className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={updatingQuoteId === quote.id}
                      onChange={(event) => updateQuoteStatus(quote.id, event.target.value)}
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
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
