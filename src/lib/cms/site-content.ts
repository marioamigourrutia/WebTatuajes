import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { appConfig } from "@/lib/config/app";
import { isFirebaseAdminBackendConfigured } from "@/lib/config/firebase-admin";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

type FirestoreLike = Firestore;

export type SiteSettings = {
  studioName: string;
  artistName: string;
  whatsappPhone: string;
  whatsappMessage: string;
  instagramUrl: string | null;
  footerText: string;
};

export type HomeProcessCardItem = {
  term: string;
  description: string;
};

export type HomeSectionVisibility = {
  reviews: boolean;
  portfolio: boolean;
  shop: boolean;
  sponsors: boolean;
  services: boolean;
  process: boolean;
  community: boolean;
  contact: boolean;
  finalCta: boolean;
};

export type HomePageContent = {
  heroEyebrow: string;
  heroKicker: string;
  heroTitle: string;
  heroDescription: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaType: "whatsapp" | "link" | "hidden";
  secondaryCtaHref: string;
  heroHint: string;
  processCardEyebrow: string;
  processCardTitle: string;
  processCardSubtitle: string;
  processCardItems: HomeProcessCardItem[];
  processSectionEyebrow: string;
  processSectionTitle: string;
  processSectionSteps: string[];
  sections: HomeSectionVisibility;
};

export type SiteContent = {
  siteSettings: SiteSettings;
  home: HomePageContent;
};

const maxProcessCardItems = 4;
const maxProcessSteps = 5;
const legacyStudioNames = new Set(["huespedtattoostudio", "huesped tattoo studio"]);

export const defaultSiteSettings: SiteSettings = {
  studioName: appConfig.brandName,
  artistName: appConfig.artistName,
  whatsappPhone: appConfig.whatsappPhone,
  whatsappMessage: appConfig.whatsappMessage,
  instagramUrl: appConfig.instagramUrl || null,
  footerText: appConfig.brandName,
};

export const defaultHomePageContent: HomePageContent = {
  heroEyebrow: "Realismo black & grey en Chile",
  heroKicker: "Mario Amigo Tattoo · {artistName}",
  heroTitle: "Tatuajes con diseño, criterio y una experiencia segura.",
  heroDescription:
    "{studioName} convierte ideas en piezas pensadas para tu cuerpo, tu ritmo y tu historia. El primer contacto parte con una cotización clara, privada y revisada personalmente.",
  primaryCtaLabel: "Solicitar cotización",
  primaryCtaHref: "/quote",
  secondaryCtaLabel: "Escribir por WhatsApp",
  secondaryCtaType: "whatsapp",
  secondaryCtaHref: "/contacto",
  heroHint: "Evaluación directa y personalizada.",
  processCardEyebrow: "Diseño personalizado",
  processCardTitle: "De la idea a una pieza viable",
  processCardSubtitle:
    "Revisamos zona, tamaño, estilo, composición y referencias antes de avanzar. Cada proyecto se evalúa de forma individual.",
  processCardItems: [
    { term: "Privado", description: "Tus datos y referencias se tratan con reserva durante la evaluación." },
    { term: "Personal", description: "Cada solicitud se revisa según tu idea, anatomía y estilo buscado." },
    { term: "Claro", description: "La cotización define viabilidad y próximos pasos antes de reservar." },
  ],
  processSectionEyebrow: "Proceso",
  processSectionTitle: "Cotizar primero permite diseñar con criterio.",
  processSectionSteps: [
    "Cuéntame la idea, zona, tamaño y presupuesto estimado.",
    "Reviso viabilidad, composición y próximos pasos de diseño.",
    "Coordinamos contacto y agenda cuando el proyecto esté claro.",
  ],
  sections: {
    reviews: true,
    portfolio: true,
    shop: true,
    sponsors: true,
    services: true,
    process: true,
    community: true,
    contact: true,
    finalCta: true,
  },
};

export const defaultSiteContent: SiteContent = {
  siteSettings: defaultSiteSettings,
  home: defaultHomePageContent,
};

function getString(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim().replace(/\s+/g, " ");
  return value.length > 0 ? value : null;
}

function cleanText(input: unknown, fallback: string, maxLength = 280): string {
  return getString(input)?.slice(0, maxLength) ?? fallback;
}

function normalizeBrandName(value: string): string {
  return legacyStudioNames.has(value.toLowerCase()) ? appConfig.brandName : value;
}

function cleanOptionalUrl(input: unknown): string | null {
  const value = getString(input);
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function cleanHref(input: unknown, fallback: string): string {
  const value = getString(input);
  if (!value) return fallback;
  if (value.startsWith("/") && !value.startsWith("//")) return value.slice(0, 120);

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function cleanSecondaryCtaType(input: unknown): HomePageContent["secondaryCtaType"] {
  return input === "link" || input === "hidden" || input === "whatsapp" ? input : "whatsapp";
}

function cleanProcessCardItems(input: unknown): HomeProcessCardItem[] {
  if (!Array.isArray(input)) return defaultHomePageContent.processCardItems;

  const items = input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const term = getString(record.term)?.slice(0, 40);
      const description = getString(record.description)?.slice(0, 180);
      return term && description ? { term, description } : null;
    })
    .filter((item): item is HomeProcessCardItem => item !== null)
    .slice(0, maxProcessCardItems);

  return items.length > 0 ? items : defaultHomePageContent.processCardItems;
}

function cleanProcessSteps(input: unknown): string[] {
  if (!Array.isArray(input)) return defaultHomePageContent.processSectionSteps;

  const steps = input
    .map((item) => getString(item)?.slice(0, 180) ?? null)
    .filter((item): item is string => item !== null)
    .slice(0, maxProcessSteps);

  return steps.length > 0 ? steps : defaultHomePageContent.processSectionSteps;
}

function cleanSections(input: unknown): HomeSectionVisibility {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return Object.fromEntries(
    Object.entries(defaultHomePageContent.sections).map(([key, fallback]) => [
      key,
      typeof record[key] === "boolean" ? record[key] : fallback,
    ]),
  ) as HomeSectionVisibility;
}

export function interpolateSiteText(value: string, settings: SiteSettings): string {
  return value
    .replaceAll("{studioName}", normalizeBrandName(settings.studioName))
    .replaceAll("{artistName}", settings.artistName);
}

export function normalizeSiteSettings(input: unknown): SiteSettings {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const storedStudioName = cleanText(
    record.studioName ?? record.studio_name,
    defaultSiteSettings.studioName,
    80,
  );

  return {
    studioName: normalizeBrandName(storedStudioName),
    artistName: cleanText(
      record.artistName ?? record.artist_name,
      defaultSiteSettings.artistName,
      80,
    ),
    whatsappPhone: cleanText(
      record.whatsappPhone ?? record.whatsapp_phone,
      defaultSiteSettings.whatsappPhone,
      32,
    ),
    whatsappMessage: cleanText(
      record.whatsappMessage ?? record.whatsapp_message,
      defaultSiteSettings.whatsappMessage,
      220,
    ),
    instagramUrl:
      cleanOptionalUrl(record.instagramUrl ?? record.instagram_url) ?? defaultSiteSettings.instagramUrl,
    footerText: normalizeBrandName(
      cleanText(record.footerText ?? record.footer_text, defaultSiteSettings.footerText, 120),
    ),
  };
}

export function normalizeHomePageContent(input: unknown): HomePageContent {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    heroEyebrow: cleanText(
      record.heroEyebrow ?? record.hero_eyebrow,
      defaultHomePageContent.heroEyebrow,
      90,
    ),
    heroKicker: cleanText(
      record.heroKicker ?? record.hero_kicker,
      defaultHomePageContent.heroKicker,
      100,
    ),
    heroTitle: cleanText(
      record.heroTitle ?? record.hero_title,
      defaultHomePageContent.heroTitle,
      120,
    ),
    heroDescription: cleanText(
      record.heroDescription ?? record.hero_description,
      defaultHomePageContent.heroDescription,
      360,
    ),
    primaryCtaLabel: cleanText(
      record.primaryCtaLabel ?? record.primary_cta_label,
      defaultHomePageContent.primaryCtaLabel,
      40,
    ),
    primaryCtaHref: cleanHref(
      record.primaryCtaHref ?? record.primary_cta_href,
      defaultHomePageContent.primaryCtaHref,
    ),
    secondaryCtaLabel: cleanText(
      record.secondaryCtaLabel ?? record.secondary_cta_label,
      defaultHomePageContent.secondaryCtaLabel,
      40,
    ),
    secondaryCtaType: cleanSecondaryCtaType(record.secondaryCtaType ?? record.secondary_cta_type),
    secondaryCtaHref: cleanHref(
      record.secondaryCtaHref ?? record.secondary_cta_href,
      defaultHomePageContent.secondaryCtaHref,
    ),
    heroHint: cleanText(record.heroHint ?? record.hero_hint, defaultHomePageContent.heroHint, 90),
    processCardEyebrow: cleanText(
      record.processCardEyebrow ?? record.process_card_eyebrow,
      defaultHomePageContent.processCardEyebrow,
      80,
    ),
    processCardTitle: cleanText(
      record.processCardTitle ?? record.process_card_title,
      defaultHomePageContent.processCardTitle,
      100,
    ),
    processCardSubtitle: cleanText(
      record.processCardSubtitle ?? record.process_card_subtitle,
      defaultHomePageContent.processCardSubtitle,
      320,
    ),
    processCardItems: cleanProcessCardItems(record.processCardItems ?? record.process_card_items),
    processSectionEyebrow: cleanText(
      record.processSectionEyebrow ?? record.process_section_eyebrow,
      defaultHomePageContent.processSectionEyebrow,
      60,
    ),
    processSectionTitle: cleanText(
      record.processSectionTitle ?? record.process_section_title,
      defaultHomePageContent.processSectionTitle,
      100,
    ),
    processSectionSteps: cleanProcessSteps(
      record.processSectionSteps ?? record.process_section_steps,
    ),
    sections: cleanSections(record.sections),
  };
}

export function validateSiteContentInput(
  input: unknown,
): { ok: true; value: SiteContent } | { ok: false; status: 400; errors: Record<string, string> } {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : null;
  if (!record) return { ok: false, status: 400, errors: { form: "Envía un JSON válido." } };

  const siteSettings = normalizeSiteSettings(record.siteSettings ?? record.site_settings ?? {});
  const home = normalizeHomePageContent(record.home ?? {});
  const errors: Record<string, string> = {};

  if (!/^\+?[0-9\s-]{8,20}$/.test(siteSettings.whatsappPhone)) {
    errors.whatsappPhone = "Ingresa un teléfono de WhatsApp válido.";
  }

  if (home.processCardItems.length === 0) {
    errors.processCardItems = "Agrega al menos un punto del resumen de proceso.";
  }

  if (home.processSectionSteps.length === 0) {
    errors.processSectionSteps = "Agrega al menos un paso del proceso.";
  }

  return Object.keys(errors).length > 0
    ? { ok: false, status: 400, errors }
    : { ok: true, value: { siteSettings, home } };
}

export function mapSiteSettingsToFirestore(settings: SiteSettings) {
  return {
    studio_name: settings.studioName,
    artist_name: settings.artistName,
    whatsapp_phone: settings.whatsappPhone,
    whatsapp_message: settings.whatsappMessage,
    instagram_url: settings.instagramUrl,
    footer_text: settings.footerText,
  };
}

export function mapHomePageContentToFirestore(home: HomePageContent) {
  return {
    hero_eyebrow: home.heroEyebrow,
    hero_kicker: home.heroKicker,
    hero_title: home.heroTitle,
    hero_description: home.heroDescription,
    primary_cta_label: home.primaryCtaLabel,
    primary_cta_href: home.primaryCtaHref,
    secondary_cta_label: home.secondaryCtaLabel,
    secondary_cta_type: home.secondaryCtaType,
    secondary_cta_href: home.secondaryCtaHref,
    hero_hint: home.heroHint,
    process_card_eyebrow: home.processCardEyebrow,
    process_card_title: home.processCardTitle,
    process_card_subtitle: home.processCardSubtitle,
    process_card_items: home.processCardItems,
    process_section_eyebrow: home.processSectionEyebrow,
    process_section_title: home.processSectionTitle,
    process_section_steps: home.processSectionSteps,
    sections: home.sections,
  };
}

async function readDocument(firestore: FirestoreLike, path: string) {
  const snapshot = await firestore.doc(path).get();
  return snapshot.exists ? snapshot.data() : null;
}

export async function getSiteContent(
  firestore: FirestoreLike | null | undefined = undefined,
): Promise<SiteContent> {
  try {
    if (firestore === undefined && !isFirebaseAdminBackendConfigured()) return defaultSiteContent;

    const cmsFirestore = firestore ?? getFirebaseAdminFirestore();
    if (!cmsFirestore) return defaultSiteContent;

    const [siteSettingsData, homeData] = await Promise.all([
      readDocument(cmsFirestore, "site_settings/main"),
      readDocument(cmsFirestore, "pages/home"),
    ]);

    return {
      siteSettings: normalizeSiteSettings(siteSettingsData ?? {}),
      home: normalizeHomePageContent(homeData ?? {}),
    };
  } catch {
    return defaultSiteContent;
  }
}

export async function saveSiteContent(firestore: FirestoreLike, input: unknown) {
  const validation = validateSiteContentInput(input);
  if (!validation.ok) return validation;

  const batch = firestore.batch();
  batch.set(
    firestore.doc("site_settings/main"),
    {
      ...mapSiteSettingsToFirestore(validation.value.siteSettings),
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  batch.set(
    firestore.doc("pages/home"),
    {
      ...mapHomePageContentToFirestore(validation.value.home),
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();

  return { ok: true as const, content: validation.value };
}
