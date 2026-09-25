"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { readJsonResponse } from "@/lib/http/safe-json";
import type { InstagramMediaItem, InstagramMediaType } from "./instagram-media";

function formatDate(value: string | null) {
  if (!value) return "sin fecha";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

function getEditorialRole(item: InstagramMediaItem) {
  if (item.hidden) return "Oculta";
  if (item.showOnHome && item.pinned) return "Hero principal";
  if (item.showOnHome && item.featured) return "Editorial destacada";
  if (item.showOnHome) return "Home secundaria";
  return "Instagram / galería";
}

export function AdminInstagramMediaPanel({ enabled }: { enabled: boolean }) {
  const { user } = useAuth();
  const [items, setItems] = useState<InstagramMediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  async function getAdminToken() {
    if (!user) throw new Error("Inicia sesión antes de administrar imágenes.");
    return user.getIdToken();
  }

  async function loadItems() {
    if (!enabled || !user) return;
    setLoading(true);
    setError(null);

    try {
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/instagram-media", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = await readJsonResponse<{ items?: InstagramMediaItem[]; error?: string }>(
        response,
        "El servidor de imágenes no devolvió JSON válido.",
      );

      if (!response.ok) {
        setError(body.error ?? "No se pudo listar la media de Instagram.");
        setItems([]);
        return;
      }

      setItems(body.items ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo listar la media.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user]);

  async function uploadEditorialImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setError(null);
    setNotice(null);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/instagram-media/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });
      const body = await readJsonResponse<{
        id?: string;
        mediaUrl?: string;
        errors?: Record<string, string>;
        error?: string;
      }>(response, "El servidor de imágenes no devolvió JSON válido.");

      if (!response.ok || !body.id) {
        setError(
          body.error ??
            Object.values(body.errors ?? {})[0] ??
            "No se pudo subir la imagen editorial.",
        );
        return;
      }

      form.reset();
      setNotice(
        "Imagen subida y registrada. Usa Home + Fijado para el hero; Home + Destacado para bloques editoriales.",
      );
      await loadItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function createManualItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const idToken = await getAdminToken();
      const payload = {
        externalId: formData.get("externalId"),
        mediaType: formData.get("mediaType") as InstagramMediaType,
        caption: formData.get("caption"),
        description: formData.get("description"),
        mediaUrl: formData.get("mediaUrl"),
        thumbnailUrl: formData.get("thumbnailUrl"),
        permalink: formData.get("permalink"),
        timestamp: formData.get("timestamp"),
        hidden: formData.get("hidden") === "on",
        featured: formData.get("featured") === "on",
        pinned: formData.get("pinned") === "on",
        showOnHome: formData.get("showOnHome") === "on",
        portfolioOnly: false,
        order: formData.get("order"),
      };
      const response = await fetch("/api/admin/instagram-media", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await readJsonResponse<{
        id?: string;
        errors?: Record<string, string>;
        error?: string;
      }>(response, "El servidor de imágenes no devolvió JSON válido.");

      if (!response.ok || !body.id) {
        setError(
          body.error ?? Object.values(body.errors ?? {})[0] ?? "No se pudo crear la media manual.",
        );
        return;
      }

      form.reset();
      setNotice("Imagen por URL creada correctamente.");
      await loadItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo crear la media.");
    } finally {
      setSaving(false);
    }
  }

  async function updateFlags(item: InstagramMediaItem, changes: Partial<InstagramMediaItem>) {
    setUpdatingItemId(item.id);
    setError(null);
    setNotice(null);

    try {
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/instagram-media", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, ...changes }),
      });
      const body = await readJsonResponse<{ error?: string }>(
        response,
        "El servidor de imágenes no devolvió JSON válido.",
      );

      if (!response.ok) {
        setError(body.error ?? "No se pudo actualizar la media.");
        return;
      }

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id ? { ...currentItem, ...changes } : currentItem,
        ),
      );
      setNotice("Imagen actualizada.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo actualizar.");
    } finally {
      setUpdatingItemId(null);
    }
  }

  async function syncInstagram() {
    setSyncing(true);
    setError(null);
    setNotice(null);

    try {
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/instagram-media/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = await readJsonResponse<{
        message?: string;
        missing?: string[];
        imported?: number;
        updated?: number;
        skipped?: number;
        errors?: string[];
      }>(response, "El servidor de Instagram no devolvió JSON válido.");
      const baseMessage =
        body.message ??
        `Sync completado: ${body.imported ?? 0} importadas, ${body.updated ?? 0} actualizadas, ${body.skipped ?? 0} omitidas.`;
      const message = body.missing?.length
        ? `${baseMessage} Faltan: ${body.missing.join(", ")}.`
        : baseMessage;

      if (!response.ok) setError(body.errors?.[0] ?? message ?? "No se pudo sincronizar.");
      else {
        setNotice(message);
        await loadItems();
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo sincronizar.");
    } finally {
      setSyncing(false);
    }
  }

  if (!enabled) return null;

  return (
    <section className="space-y-5 rounded-3xl border border-stone-800 bg-stone-900/50 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="neo-kicker">Visuales del sitio</p>
          <h3 className="mt-2 text-xl font-bold text-stone-50">Imágenes editoriales / Instagram</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">
            Este es el catálogo visual principal. Marca <strong className="text-stone-200">Home + Fijado</strong> para usar una imagen como protagonista del hero. Marca <strong className="text-stone-200">Home + Destacado</strong> para usarla en composiciones secundarias. El campo Orden define prioridad.
          </p>
        </div>
        <button
          className="w-fit rounded-full border border-amber-300/50 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-60"
          disabled={syncing}
          onClick={syncInstagram}
          type="button"
        >
          {syncing ? "Sincronizando…" : "Sincronizar Instagram"}
        </button>
      </div>

      {error ? <p className="rounded-xl border border-red-300/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
      {notice ? <p className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</p> : null}

      <form
        className="grid gap-4 rounded-2xl border border-stone-800 bg-stone-950/70 p-4"
        encType="multipart/form-data"
        onSubmit={uploadEditorialImage}
      >
        <div>
          <h4 className="font-bold text-stone-100">Subir imagen desde tu equipo</h4>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            Disponible cuando Cloudinary está configurado en Vercel. Si no lo está, usa el formulario por URL que aparece debajo. JPG, PNG o WEBP, máximo configurado por el servidor.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            Imagen
            <input
              accept="image/jpeg,image/png,image/webp"
              className="border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
              name="image"
              required
              type="file"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            Orden
            <input
              className="border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
              min="0"
              max="9999"
              name="order"
              placeholder="0 = primero"
              type="number"
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-stone-200">
          Nombre / caption
          <input
            className="border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
            maxLength={2200}
            name="caption"
            placeholder="Ej.: Retrato black & grey — hero principal"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-stone-200">
          Descripción corta
          <input
            className="border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
            maxLength={500}
            name="description"
            placeholder="Texto interno para identificar el uso visual"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-stone-200">
          Link de Instagram opcional
          <input
            className="border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
            name="permalink"
            placeholder="https://www.instagram.com/p/..."
            type="url"
          />
        </label>
        <div className="flex flex-wrap gap-4 text-sm text-stone-200">
          <label className="flex items-center gap-2"><input defaultChecked name="showOnHome" type="checkbox" />Home</label>
          <label className="flex items-center gap-2"><input name="pinned" type="checkbox" />Fijado / hero</label>
          <label className="flex items-center gap-2"><input name="featured" type="checkbox" />Destacado</label>
        </div>
        <button className="w-fit rounded-full bg-amber-300 px-5 py-2 font-semibold text-stone-950 disabled:opacity-60" disabled={uploading} type="submit">
          {uploading ? "Subiendo…" : "Subir imagen editorial"}
        </button>
      </form>

      <form
        className="grid gap-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4"
        onSubmit={createManualItem}
      >
        <div>
          <h4 className="font-bold text-stone-100">Agregar por URL pública</h4>
          <p className="mt-1 text-xs leading-5 text-stone-500">Útil para imágenes ya alojadas, media sincronizada o un CDN externo.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            ID manual/opcional
            <input className="border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" name="externalId" placeholder="editorial-001" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            Tipo
            <select className="border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" name="mediaType" required>
              <option value="IMAGE">Imagen</option>
              <option value="VIDEO">Video</option>
              <option value="CAROUSEL_ALBUM">Carrusel</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-stone-200">
          Caption / descripción
          <textarea className="min-h-20 border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" maxLength={2200} name="caption" required />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-stone-200">
          Descripción corta opcional
          <input className="border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" maxLength={500} name="description" />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            URL pública media
            <input className="border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" name="mediaUrl" placeholder="https://..." required type="url" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            Thumbnail opcional
            <input className="border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" name="thumbnailUrl" placeholder="https://..." type="url" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            Permalink Instagram opcional
            <input className="border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" name="permalink" placeholder="https://www.instagram.com/p/..." type="url" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            Orden
            <input className="border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" min="0" max="9999" name="order" type="number" />
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-stone-200">
          <label className="flex items-center gap-2"><input name="featured" type="checkbox" />Destacado</label>
          <label className="flex items-center gap-2"><input name="pinned" type="checkbox" />Fijado / hero</label>
          <label className="flex items-center gap-2"><input name="showOnHome" type="checkbox" />Home</label>
          <label className="flex items-center gap-2"><input name="hidden" type="checkbox" />Oculto</label>
        </div>
        <button className="w-fit rounded-full border border-stone-500 px-5 py-2 font-semibold text-stone-100 disabled:opacity-60" disabled={saving} type="submit">
          {saving ? "Creando…" : "Agregar URL"}
        </button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-stone-100">Imágenes y media reciente</h4>
            <p className="mt-1 text-xs text-stone-500">La prioridad visual se calcula con Fijado, Orden y fecha.</p>
          </div>
          <button className="rounded-full border border-stone-700 px-3 py-1 text-sm text-stone-200" disabled={loading} onClick={loadItems} type="button">
            {loading ? "Cargando…" : "Refrescar"}
          </button>
        </div>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4 text-sm text-stone-400">Todavía no hay imágenes manuales o sincronizadas.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <li className="border border-stone-800 bg-stone-950/70 p-4" key={item.id}>
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={item.caption} className="h-24 w-24 shrink-0 object-cover" src={item.thumbnailUrl || item.mediaUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="border border-stone-700 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-300">{getEditorialRole(item)}</span>
                      {item.order !== null ? <span className="text-xs text-stone-500">Orden {item.order}</span> : null}
                    </div>
                    <p className="mt-2 line-clamp-2 font-semibold text-stone-100">{item.caption}</p>
                    <p className="mt-1 text-xs text-stone-500">{item.mediaType} · {item.source} · {formatDate(item.timestamp || item.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-stone-200">
                  <label className="flex items-center gap-2"><input checked={item.hidden} disabled={updatingItemId === item.id} onChange={(event) => updateFlags(item, { hidden: event.target.checked })} type="checkbox" />Oculto</label>
                  <label className="flex items-center gap-2"><input checked={item.featured} disabled={updatingItemId === item.id} onChange={(event) => updateFlags(item, { featured: event.target.checked })} type="checkbox" />Destacado</label>
                  <label className="flex items-center gap-2"><input checked={item.pinned} disabled={updatingItemId === item.id} onChange={(event) => updateFlags(item, { pinned: event.target.checked })} type="checkbox" />Fijado</label>
                  <label className="flex items-center gap-2"><input checked={item.showOnHome} disabled={updatingItemId === item.id} onChange={(event) => updateFlags(item, { showOnHome: event.target.checked })} type="checkbox" />Home</label>
                </div>
                {item.permalink ? <a className="mt-3 inline-flex text-xs font-semibold text-stone-300 underline underline-offset-4" href={item.permalink} rel="noreferrer" target="_blank">Abrir en Instagram ↗</a> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
