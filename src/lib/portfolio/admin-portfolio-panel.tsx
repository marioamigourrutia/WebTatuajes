"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { readJsonResponse } from "@/lib/http/safe-json";

type AdminPortfolioItem = {
  id: string;
  title: string;
  style: string;
  bodyArea: string;
  description: string;
  tags: string[];
  published: boolean;
  createdAt: string | null;
  imageUrl?: string | null;
  imagePath?: string | null;
  imageOriginalFilename: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "sin fecha";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminPortfolioPanel({
  enabled,
  fileUploadsEnabled,
}: {
  enabled: boolean;
  fileUploadsEnabled: boolean;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<AdminPortfolioItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});

  async function getAdminToken() {
    if (!user) throw new Error("Inicia sesión antes de administrar el portafolio.");
    return user.getIdToken();
  }

  async function loadPortfolioItems() {
    if (!enabled || !user) return;
    setLoading(true);
    setError(null);

    try {
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/portfolio", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = await readJsonResponse<{ items?: AdminPortfolioItem[]; error?: string }>(
        response,
        "El servidor de portafolio no devolvió JSON válido.",
      );

      if (!response.ok) {
        setError(body.error ?? "No se pudo listar el portafolio admin.");
        setItems([]);
        return;
      }

      setItems(Array.isArray(body.items) ? body.items : []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo listar el portafolio admin.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadPortfolioItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user]);

  useEffect(() => {
    const directImageEntries = items.flatMap((item) =>
      item.imageUrl?.startsWith("https://") ? [[item.id, item.imageUrl] as const] : [],
    );
    const imageRequests = items
      .filter((item) => item.imagePath)
      .map((item) => ({ id: item.id, accessUrl: `/api/admin/portfolio/images?itemId=${encodeURIComponent(item.id)}` }));

    if (!enabled || !user || imageRequests.length === 0) {
      void Promise.resolve().then(() => setImagePreviewUrls(Object.fromEntries(directImageEntries)));
      return;
    }

    const currentUser = user;
    let cancelled = false;
    const objectUrls: string[] = [];

    function revokeObjectUrls() {
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
      objectUrls.length = 0;
    }

    async function loadImagePreviews() {
      try {
        setImagePreviewUrls(Object.fromEntries(directImageEntries));
        const idToken = await currentUser.getIdToken();
        const loadedEntries = await Promise.all(
          imageRequests.map(async (image) => {
            const response = await fetch(image.accessUrl, { headers: { Authorization: `Bearer ${idToken}` } });
            if (!response.ok) throw new Error("Image proxy request failed.");
            const objectUrl = URL.createObjectURL(await response.blob());
            objectUrls.push(objectUrl);
            return [image.id, objectUrl] as const;
          }),
        );
        if (cancelled) revokeObjectUrls();
        else setImagePreviewUrls(Object.fromEntries([...directImageEntries, ...loadedEntries]));
      } catch {
        revokeObjectUrls();
        if (!cancelled) setImagePreviewUrls(Object.fromEntries(directImageEntries));
      }
    }

    void loadImagePreviews();
    return () => {
      cancelled = true;
      revokeObjectUrls();
    };
  }, [enabled, items, user]);

  async function createPortfolioItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const idToken = await getAdminToken();
      const form = event.currentTarget;
      const formData = new FormData(form);
      formData.set("published", formData.get("published") === "on" ? "true" : "false");
      const response = await fetch("/api/admin/portfolio", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });
      const body = await readJsonResponse<{ id?: string; errors?: Record<string, string> }>(
        response,
        "El servidor no pudo procesar el portafolio correctamente.",
      );
      if (!response.ok || !body.id) {
        setError(Object.values(body.errors ?? {})[0] ?? "No se pudo crear el ítem de portafolio.");
        return;
      }
      form.reset();
      setNotice("Ítem creado correctamente.");
      await loadPortfolioItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo crear el ítem de portafolio.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(itemId: string, published: boolean) {
    setUpdatingItemId(itemId);
    setError(null);
    setNotice(null);
    try {
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/portfolio/published", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, published }),
      });
      const body = await readJsonResponse<{ published?: boolean; error?: string }>(
        response,
        "El servidor no pudo actualizar la publicación correctamente.",
      );
      if (!response.ok || typeof body.published !== "boolean") {
        setError(body.error ?? "No se pudo cambiar la publicación.");
        return;
      }
      setItems((currentItems) => currentItems.map((item) => item.id === itemId ? { ...item, published: body.published ?? item.published } : item));
      setNotice("Publicación actualizada.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo cambiar la publicación.");
    } finally {
      setUpdatingItemId(null);
    }
  }

  if (!enabled) return null;

  return (
    <section className="space-y-4 rounded-3xl border border-stone-800 bg-stone-900/50 p-5">
      <div>
        <h3 className="text-xl font-bold text-stone-50">Portafolio administrable</h3>
        <p className="mt-1 text-sm text-stone-400">Administra piezas internas. Esta sección no aparece en la navegación pública actual, pero conserva los datos existentes.</p>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      <form className="grid gap-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4" onSubmit={createPortfolioItem}>
        <div className="grid gap-3 md:grid-cols-2">
          {[["Título","title",100],["Estilo","style",80],["Zona del cuerpo","bodyArea",80],["Etiquetas separadas por coma","tags",200]].map(([label,name,max]) => (
            <label className="grid gap-1 text-sm font-semibold text-stone-200" key={String(name)}>{String(label)}<input className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" maxLength={Number(max)} name={String(name)} required={name !== "tags"} /></label>
          ))}
        </div>
        <label className="grid gap-1 text-sm font-semibold text-stone-200">Descripción corta<textarea className="min-h-24 rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" maxLength={500} name="description" required /></label>
        {fileUploadsEnabled ? (
          <label className="text-sm font-semibold text-stone-200">Imagen principal opcional<input accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm text-stone-300" name="image" type="file" /></label>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-stone-300">La carga directa de archivos está deshabilitada. Usa una URL pública de imagen.</div>
        )}
        <label className="grid gap-1 text-sm font-semibold text-stone-200">URL pública de imagen opcional<input className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" inputMode="url" name="externalImageUrl" placeholder="https://..." type="url" /></label>
        <label className="flex items-center gap-2 text-sm text-stone-200"><input className="h-4 w-4" name="published" type="checkbox" />Publicado internamente</label>
        <button className="w-fit rounded-full border border-white/20 bg-zinc-900 px-5 py-2 font-semibold text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Creando…" : "Crear ítem"}</button>
      </form>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3"><h4 className="font-bold text-stone-100">Ítems recientes</h4><button className="rounded-full border border-stone-700 px-3 py-1 text-sm text-stone-200" disabled={loading} onClick={loadPortfolioItems} type="button">{loading ? "Cargando…" : "Refrescar"}</button></div>
        {items.length === 0 ? <p className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4 text-sm text-stone-400">Todavía no hay ítems administrables.</p> : (
          <ul className="grid gap-3 md:grid-cols-2">{items.map((item) => <li className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4" key={item.id}><div className="flex gap-3">{imagePreviewUrls[item.id] ? <img alt={item.title} className="h-20 w-20 rounded-xl object-cover" src={imagePreviewUrls[item.id]} /> : null}<div className="min-w-0 flex-1"><p className="font-semibold text-stone-100">{item.title}</p><p className="text-sm text-stone-400">{item.style} · {item.bodyArea}</p><p className="text-xs text-stone-500">{formatDate(item.createdAt)}</p></div></div><p className="mt-3 line-clamp-2 text-sm text-stone-300">{item.description}</p><label className="mt-4 flex items-center gap-2 text-sm text-stone-200"><input checked={item.published} disabled={updatingItemId === item.id} onChange={(event) => togglePublished(item.id, event.target.checked)} type="checkbox" />Publicado</label></li>)}</ul>
        )}
      </div>
    </section>
  );
}
