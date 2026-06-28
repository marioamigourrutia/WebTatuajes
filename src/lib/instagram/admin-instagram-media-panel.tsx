"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import type { InstagramMediaItem, InstagramMediaType } from "./instagram-media";

function formatDate(value: string | null) {
  if (!value) return "sin fecha";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function AdminInstagramMediaPanel({ enabled }: { enabled: boolean }) {
  const { user } = useAuth();
  const [items, setItems] = useState<InstagramMediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  async function getAdminToken() {
    if (!user) throw new Error("Inicia sesión antes de administrar Instagram.");
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
      const body = (await response.json()) as { items?: InstagramMediaItem[]; error?: string };

      if (!response.ok) {
        setError(body.error ?? "No se pudo listar media de Instagram.");
        setItems([]);
        return;
      }

      setItems(body.items ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo listar media.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user]);

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
        portfolioOnly: formData.get("portfolioOnly") === "on",
        order: formData.get("order"),
      };
      const response = await fetch("/api/admin/instagram-media", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { id?: string; errors?: Record<string, string> };

      if (!response.ok || !body.id) {
        setError(Object.values(body.errors ?? {})[0] ?? "No se pudo crear la media manual.");
        return;
      }

      form.reset();
      setNotice(
        "Media manual creada. La sincronización oficial sigue deshabilitada sin credenciales.",
      );
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
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(body.error ?? "No se pudo actualizar la media.");
        return;
      }

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id ? { ...currentItem, ...changes } : currentItem,
        ),
      );
      setNotice("Media actualizada con rol admin validado en servidor.");
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
      const body = (await response.json()) as { message?: string; missing?: string[] };
      const message = body.missing?.length
        ? `${body.message} Faltan: ${body.missing.join(", ")}.`
        : body.message;

      if (!response.ok) setError(message ?? "Sincronización deshabilitada.");
      else setNotice(message ?? "Sincronización ejecutada.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo sincronizar.");
    } finally {
      setSyncing(false);
    }
  }

  if (!enabled) return null;

  return (
    <section className="space-y-4 rounded-3xl border border-stone-800 bg-stone-900/50 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-bold text-stone-50">Instagram / media de portafolio</h3>
          <p className="mt-1 text-sm leading-6 text-stone-400">
            Base preparada para API oficial. Sin credenciales server-only, usa fallback manual y el
            sync responde deshabilitado.
          </p>
        </div>
        <button
          className="w-fit rounded-full border border-amber-300/50 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-60"
          disabled={syncing}
          onClick={syncInstagram}
          type="button"
        >
          {syncing ? "Revisando…" : "Sincronizar Instagram"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}

      <form
        className="grid gap-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4"
        onSubmit={createManualItem}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            ID manual/opcional
            <input
              className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
              name="externalId"
              placeholder="manual-flor-001"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            Tipo
            <select
              className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
              name="mediaType"
              required
            >
              <option value="IMAGE">Imagen</option>
              <option value="VIDEO">Video</option>
              <option value="CAROUSEL_ALBUM">Carrusel</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-stone-200">
          Caption / descripción
          <textarea
            className="min-h-20 rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
            maxLength={2200}
            name="caption"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-stone-200">
          Descripción corta opcional
          <input
            className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
            maxLength={500}
            name="description"
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            URL pública media
            <input
              className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
              name="mediaUrl"
              placeholder="https://..."
              required
              type="url"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            Thumbnail opcional
            <input
              className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
              name="thumbnailUrl"
              placeholder="https://..."
              type="url"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            Permalink opcional
            <input
              className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
              name="permalink"
              placeholder="https://www.instagram.com/p/..."
              type="url"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">
            Fecha opcional
            <input
              className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
              name="timestamp"
              type="datetime-local"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-stone-200">
          <label className="flex items-center gap-2">
            <input name="featured" type="checkbox" />
            Destacado
          </label>
          <label className="flex items-center gap-2">
            <input name="pinned" type="checkbox" />
            Fijado
          </label>
          <label className="flex items-center gap-2">
            <input name="showOnHome" type="checkbox" />
            Home
          </label>
          <label className="flex items-center gap-2">
            <input name="portfolioOnly" type="checkbox" />
            Solo portafolio
          </label>
          <label className="flex items-center gap-2">
            <input name="hidden" type="checkbox" />
            Oculto
          </label>
        </div>
        <button
          className="w-fit rounded-full bg-amber-300 px-5 py-2 font-semibold text-stone-950 disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          {saving ? "Creando…" : "Crear media manual"}
        </button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-bold text-stone-100">Media reciente</h4>
          <button
            className="rounded-full border border-stone-700 px-3 py-1 text-sm text-stone-200"
            disabled={loading}
            onClick={loadItems}
            type="button"
          >
            {loading ? "Cargando…" : "Refrescar"}
          </button>
        </div>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4 text-sm text-stone-400">
            Todavía no hay media manual o sincronizada.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <li className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4" key={item.id}>
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={item.caption}
                    className="h-20 w-20 rounded-xl object-cover"
                    src={item.thumbnailUrl || item.mediaUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-semibold text-stone-100">{item.caption}</p>
                    <p className="text-xs text-stone-500">
                      {item.mediaType} · {item.source} ·{" "}
                      {formatDate(item.timestamp || item.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-stone-200">
                  <label className="flex items-center gap-2">
                    <input
                      checked={item.hidden}
                      disabled={updatingItemId === item.id}
                      onChange={(event) => updateFlags(item, { hidden: event.target.checked })}
                      type="checkbox"
                    />
                    Oculto
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      checked={item.featured}
                      disabled={updatingItemId === item.id}
                      onChange={(event) => updateFlags(item, { featured: event.target.checked })}
                      type="checkbox"
                    />
                    Destacado
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      checked={item.pinned}
                      disabled={updatingItemId === item.id}
                      onChange={(event) => updateFlags(item, { pinned: event.target.checked })}
                      type="checkbox"
                    />
                    Fijado
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      checked={item.showOnHome}
                      disabled={updatingItemId === item.id}
                      onChange={(event) => updateFlags(item, { showOnHome: event.target.checked })}
                      type="checkbox"
                    />
                    Home
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
