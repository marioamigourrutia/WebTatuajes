"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { readJsonResponse } from "@/lib/http/safe-json";
import type { Sponsor } from "./sponsor";

function formatDate(value: string | null) {
  if (!value) return "sin fecha";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function AdminSponsorsPanel({ enabled }: { enabled: boolean }) {
  const { user } = useAuth();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingSponsorId, setUpdatingSponsorId] = useState<string | null>(null);

  async function getAdminToken() {
    if (!user) throw new Error("Inicia sesión antes de administrar colaboradores.");
    return user.getIdToken();
  }

  async function loadSponsors() {
    if (!enabled || !user) return;
    setLoading(true);
    setError(null);
    try {
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/sponsors", { headers: { Authorization: `Bearer ${idToken}` } });
      const body = await readJsonResponse<{ sponsors?: Sponsor[]; error?: string }>(response, "La API de colaboradores no devolvió JSON válido.");
      if (!response.ok) {
        setError(body.error ?? "No se pudo listar colaboradores.");
        setSponsors([]);
        return;
      }
      setSponsors(Array.isArray(body.sponsors) ? body.sponsors : []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo listar colaboradores.");
      setSponsors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadSponsors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user]);

  async function createSponsor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/sponsors", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, active: formData.get("active") === "on" }),
      });
      const body = await readJsonResponse<{ id?: string; errors?: Record<string, string>; error?: string }>(response, "La API de colaboradores no pudo crear el registro correctamente.");
      if (!response.ok || !body.id) {
        setError(body.error ?? Object.values(body.errors ?? {})[0] ?? "No se pudo crear el colaborador.");
        return;
      }
      form.reset();
      setNotice("Colaborador creado correctamente.");
      await loadSponsors();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo crear el colaborador.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSponsor(sponsor: Sponsor, active = sponsor.active) {
    setUpdatingSponsorId(sponsor.id);
    setError(null);
    setNotice(null);
    try {
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/sponsors", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...sponsor, sponsorId: sponsor.id, active }),
      });
      const body = await readJsonResponse<{ id?: string; errors?: Record<string, string>; error?: string }>(response, "La API de colaboradores no pudo actualizar el registro correctamente.");
      if (!response.ok || !body.id) {
        setError(body.error ?? Object.values(body.errors ?? {})[0] ?? "No se pudo actualizar el colaborador.");
        return;
      }
      setSponsors((current) => current.map((item) => item.id === sponsor.id ? { ...item, active } : item));
      setNotice("Colaborador actualizado.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo actualizar el colaborador.");
    } finally {
      setUpdatingSponsorId(null);
    }
  }

  async function removeSponsor(sponsorId: string) {
    setUpdatingSponsorId(sponsorId);
    setError(null);
    setNotice(null);
    try {
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/sponsors", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorId }),
      });
      const body = await readJsonResponse<{ id?: string; error?: string }>(response, "La API de colaboradores no pudo eliminar el registro correctamente.");
      if (!response.ok || !body.id) {
        setError(body.error ?? "No se pudo eliminar el colaborador.");
        return;
      }
      setSponsors((current) => current.filter((item) => item.id !== sponsorId));
      setNotice("Colaborador eliminado.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo eliminar el colaborador.");
    } finally {
      setUpdatingSponsorId(null);
    }
  }

  if (!enabled) return null;

  return (
    <section className="space-y-4 rounded-3xl border border-stone-800 bg-stone-900/50 p-5">
      <div><h3 className="text-xl font-bold text-stone-50">Colaboradores</h3><p className="mt-1 text-sm text-stone-400">Gestiona marcas, estudios aliados o proveedores visibles en la sección pública.</p></div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      <form className="grid gap-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4" onSubmit={createSponsor}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-stone-200">Nombre<input className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" maxLength={100} name="name" required /></label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">Categoría<input className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" maxLength={80} name="category" placeholder="Proveedor, marca aliada, estudio invitado" required /></label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">Sitio web opcional<input className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" inputMode="url" name="websiteUrl" placeholder="https://..." type="url" /></label>
          <label className="grid gap-1 text-sm font-semibold text-stone-200">URL de logo opcional<input className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" inputMode="url" name="logoUrl" placeholder="https://..." type="url" /></label>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-stone-200">Descripción pública<textarea className="min-h-20 rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" maxLength={280} name="description" required /></label>
        <div className="flex flex-wrap items-center gap-4"><label className="grid gap-1 text-sm font-semibold text-stone-200">Orden<input className="w-28 rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" defaultValue={0} min={0} max={999} name="sortOrder" type="number" /></label><label className="flex items-center gap-2 text-sm text-stone-200"><input className="h-4 w-4" name="active" type="checkbox" />Mostrar en público</label></div>
        <button className="w-fit rounded-full border border-white/20 bg-zinc-900 px-5 py-2 font-semibold text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Creando…" : "Crear colaborador"}</button>
      </form>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3"><h4 className="font-bold text-stone-100">Colaboradores registrados</h4><button className="rounded-full border border-stone-700 px-3 py-1 text-sm text-stone-200" disabled={loading} onClick={loadSponsors} type="button">{loading ? "Cargando…" : "Refrescar"}</button></div>
        {sponsors.length === 0 ? <p className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4 text-sm text-stone-400">Todavía no hay colaboradores registrados.</p> : <ul className="grid gap-3 md:grid-cols-2">{sponsors.map((sponsor) => <li className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4" key={sponsor.id}><div className="flex gap-3">{sponsor.logoUrl ? <img alt={sponsor.name} className="h-14 w-14 rounded-xl object-cover" src={sponsor.logoUrl} /> : null}<div className="min-w-0 flex-1"><p className="font-semibold text-stone-100">{sponsor.name}</p><p className="text-sm text-stone-400">{sponsor.category}</p><p className="text-xs text-stone-500">{formatDate(sponsor.createdAt)}</p></div></div><p className="mt-3 line-clamp-3 text-sm text-stone-300">{sponsor.description}</p><div className="mt-4 flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm text-stone-200"><input checked={sponsor.active} disabled={updatingSponsorId === sponsor.id} onChange={(event) => saveSponsor(sponsor, event.target.checked)} type="checkbox" />Visible</label><button className="rounded-full border border-red-300/50 px-3 py-1 text-sm text-red-100" disabled={updatingSponsorId === sponsor.id} onClick={() => removeSponsor(sponsor.id)} type="button">Eliminar</button></div></li>)}</ul>}
      </div>
    </section>
  );
}
