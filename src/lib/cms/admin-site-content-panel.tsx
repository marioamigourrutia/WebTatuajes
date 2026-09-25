"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { readJsonResponse } from "@/lib/http/safe-json";
import type { HomePageContent, SiteContent, SiteSettings } from "./site-content";

type AdminSiteContentPanelProps = { enabled: boolean };

const visibleSectionLabels: Array<[keyof HomePageContent["sections"], string]> = [
  ["process", "Proceso / Client info"],
  ["reviews", "Opiniones"],
  ["sponsors", "Colaboradores"],
  ["community", "Comunidad"],
  ["contact", "Contacto"],
  ["finalCta", "Llamado final de cotización"],
];

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function Input({
  label,
  name,
  value,
  maxLength = 180,
}: {
  label: string;
  name: string;
  value: string;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-stone-200">
      {label}
      <input
        className="border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
        defaultValue={value}
        maxLength={maxLength}
        name={name}
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  value,
  rows = 3,
  maxLength = 500,
}: {
  label: string;
  name: string;
  value: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-stone-200">
      {label}
      <textarea
        className="border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
        defaultValue={value}
        maxLength={maxLength}
        name={name}
        rows={rows}
      />
    </label>
  );
}

export function AdminSiteContentPanel({ enabled }: AdminSiteContentPanelProps) {
  const { user } = useAuth();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function getAdminToken() {
    if (!user) throw new Error("Inicia sesión antes de administrar contenido del sitio.");
    return user.getIdToken();
  }

  async function loadContent() {
    if (!enabled || !user) return;
    setLoading(true);
    setError(null);
    try {
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/site-content", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = await readJsonResponse<{ content?: SiteContent; error?: string }>(
        response,
        "El servidor de contenido no devolvió JSON válido.",
      );
      if (!response.ok || !body.content) {
        setError(body.error ?? "No se pudo cargar el contenido del sitio.");
        return;
      }
      setContent(body.content);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo cargar el contenido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user]);

  function buildPayload(formData: FormData): SiteContent {
    if (!content) throw new Error("Carga el contenido antes de guardar.");

    const siteSettings: SiteSettings = {
      studioName: String(formData.get("studioName") ?? ""),
      artistName: String(formData.get("artistName") ?? ""),
      whatsappPhone: String(formData.get("whatsappPhone") ?? ""),
      whatsappMessage: String(formData.get("whatsappMessage") ?? ""),
      instagramUrl: String(formData.get("instagramUrl") ?? "") || null,
      footerText: String(formData.get("footerText") ?? ""),
    };

    const processCardTerms = splitLines(String(formData.get("processCardTerms") ?? ""));
    const processCardDescriptions = splitLines(
      String(formData.get("processCardDescriptions") ?? ""),
    );
    const nextSections = { ...content.home.sections };
    for (const [key] of visibleSectionLabels) nextSections[key] = formData.get(key) === "on";

    return {
      siteSettings,
      home: {
        ...content.home,
        heroEyebrow: String(formData.get("heroEyebrow") ?? ""),
        heroKicker: String(formData.get("heroKicker") ?? ""),
        heroTitle: String(formData.get("heroTitle") ?? ""),
        heroDescription: String(formData.get("heroDescription") ?? ""),
        primaryCtaLabel: String(formData.get("primaryCtaLabel") ?? ""),
        primaryCtaHref: String(formData.get("primaryCtaHref") ?? ""),
        secondaryCtaLabel: String(formData.get("secondaryCtaLabel") ?? ""),
        secondaryCtaType: String(
          formData.get("secondaryCtaType") ?? "whatsapp",
        ) as HomePageContent["secondaryCtaType"],
        secondaryCtaHref: String(formData.get("secondaryCtaHref") ?? ""),
        heroHint: String(formData.get("heroHint") ?? ""),
        processCardEyebrow: String(formData.get("processCardEyebrow") ?? ""),
        processCardTitle: String(formData.get("processCardTitle") ?? ""),
        processCardSubtitle: String(formData.get("processCardSubtitle") ?? ""),
        processCardItems: processCardTerms.map((term, index) => ({
          term,
          description: processCardDescriptions[index] ?? "",
        })),
        processSectionEyebrow: String(formData.get("processSectionEyebrow") ?? ""),
        processSectionTitle: String(formData.get("processSectionTitle") ?? ""),
        processSectionSteps: splitLines(String(formData.get("processSectionSteps") ?? "")),
        sections: nextSections,
      },
    };
  }

  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = buildPayload(new FormData(event.currentTarget));
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/site-content", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await readJsonResponse<{
        content?: SiteContent;
        errors?: Record<string, string>;
        error?: string;
      }>(response, "El servidor no pudo guardar el contenido correctamente.");
      if (!response.ok || !body.content) {
        setError(
          body.error ??
            Object.values(body.errors ?? {})[0] ??
            "No se pudo guardar el contenido.",
        );
        return;
      }
      setContent(body.content);
      setNotice("Contenido guardado. Los cambios se reflejan en Inicio al recargar la página.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (!enabled) return null;

  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-stone-900/50 p-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">
          Contenido del sitio
        </p>
        <h3 className="mt-2 text-xl font-bold text-stone-50">Inicio y datos de contacto</h3>
        <p className="mt-1 text-sm text-stone-400">
          Todos estos controles están conectados con la portada actual. Las imágenes se administran en el bloque “Imágenes editoriales / Instagram”.
        </p>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      {loading ? <p className="text-sm text-stone-400">Cargando contenido actual…</p> : null}

      {content ? (
        <form className="space-y-4" onSubmit={saveContent}>
          <fieldset className="grid gap-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4 md:grid-cols-2">
            <legend className="px-1 text-sm font-bold text-stone-100">Datos generales</legend>
            <Input label="Marca / estudio" name="studioName" value={content.siteSettings.studioName} />
            <Input label="Artista" name="artistName" value={content.siteSettings.artistName} />
            <Input label="WhatsApp" name="whatsappPhone" value={content.siteSettings.whatsappPhone} />
            <Input label="Instagram" name="instagramUrl" value={content.siteSettings.instagramUrl ?? ""} />
            <TextArea label="Mensaje base de WhatsApp" name="whatsappMessage" value={content.siteSettings.whatsappMessage} />
            <Input label="Texto de pie de página" name="footerText" value={content.siteSettings.footerText} />
          </fieldset>

          <fieldset className="grid gap-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4 md:grid-cols-2">
            <legend className="px-1 text-sm font-bold text-stone-100">Portada</legend>
            <Input label="Etiqueta superior" name="heroEyebrow" value={content.home.heroEyebrow} />
            <Input label="Línea secundaria" name="heroKicker" value={content.home.heroKicker} />
            <Input label="Título principal" name="heroTitle" value={content.home.heroTitle} maxLength={140} />
            <Input label="Texto corto bajo botones" name="heroHint" value={content.home.heroHint} />
            <TextArea label="Descripción principal" name="heroDescription" value={content.home.heroDescription} rows={4} />
            <div className="grid gap-3">
              <Input label="CTA principal" name="primaryCtaLabel" value={content.home.primaryCtaLabel} />
              <Input label="Enlace CTA principal" name="primaryCtaHref" value={content.home.primaryCtaHref} />
            </div>
            <div className="grid gap-3">
              <Input label="CTA secundario" name="secondaryCtaLabel" value={content.home.secondaryCtaLabel} />
              <label className="grid gap-1 text-sm font-semibold text-stone-200">
                Tipo de CTA secundario
                <select className="border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100" defaultValue={content.home.secondaryCtaType} name="secondaryCtaType">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="link">Enlace manual</option>
                  <option value="hidden">Oculto</option>
                </select>
              </label>
              <Input label="Enlace secundario" name="secondaryCtaHref" value={content.home.secondaryCtaHref} />
            </div>
          </fieldset>

          <fieldset className="grid gap-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4 md:grid-cols-2">
            <legend className="px-1 text-sm font-bold text-stone-100">Bloque editorial de proceso</legend>
            <Input label="Etiqueta editorial" name="processCardEyebrow" value={content.home.processCardEyebrow} />
            <Input label="Título editorial" name="processCardTitle" value={content.home.processCardTitle} />
            <TextArea label="Descripción editorial" name="processCardSubtitle" value={content.home.processCardSubtitle} rows={3} />
            <TextArea label="Títulos de puntos, uno por línea" name="processCardTerms" value={content.home.processCardItems.map((item) => item.term).join("\n")} rows={4} />
            <TextArea label="Descripciones de puntos, una por línea" name="processCardDescriptions" value={content.home.processCardItems.map((item) => item.description).join("\n")} rows={5} />
          </fieldset>

          <fieldset className="grid gap-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4 md:grid-cols-2">
            <legend className="px-1 text-sm font-bold text-stone-100">Pasos del proceso</legend>
            <Input label="Etiqueta" name="processSectionEyebrow" value={content.home.processSectionEyebrow} />
            <Input label="Título" name="processSectionTitle" value={content.home.processSectionTitle} />
            <TextArea label="Pasos, uno por línea" name="processSectionSteps" value={content.home.processSectionSteps.join("\n")} rows={5} />
          </fieldset>

          <fieldset className="grid gap-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <legend className="px-1 text-sm font-bold text-stone-100">Visibilidad real de Inicio</legend>
            {visibleSectionLabels.map(([key, label]) => (
              <label className="flex items-center gap-2 text-sm font-semibold text-stone-200" key={key}>
                <input defaultChecked={content.home.sections[key]} name={key} type="checkbox" />
                {label}
              </label>
            ))}
          </fieldset>

          <button className="rounded-full border border-white/20 bg-zinc-900 px-5 py-2 font-semibold text-white disabled:opacity-60" disabled={saving || !user} type="submit">
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      ) : (
        <p className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4 text-sm text-stone-400">
          Valida el rol admin para cargar la configuración editable.
        </p>
      )}
    </section>
  );
}
