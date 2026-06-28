import { FieldValue } from "firebase-admin/firestore";
import { sanitizeExternalImageUrl } from "@/lib/images/external-image-url";

type FirestoreLike = {
  collection: (path: string) => {
    doc: (id?: string) => {
      set: (data: Record<string, unknown>) => Promise<unknown>;
      get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
      update: (data: Record<string, unknown>) => Promise<unknown>;
      id: string;
    };
    orderBy: (field: string, direction?: "asc" | "desc") => FirestoreQueryLike;
    where: (field: string, operator: string, value: unknown) => FirestoreQueryLike;
  };
};

type FirestoreQueryLike = {
  orderBy: (field: string, direction?: "asc" | "desc") => FirestoreQueryLike;
  where: (field: string, operator: string, value: unknown) => FirestoreQueryLike;
  limit: (limit: number) => FirestoreQueryLike;
  get: () => Promise<{ docs: FirestoreDocumentLike[] }>;
};

type FirestoreDocumentLike = {
  id: string;
  data: () => Record<string, unknown>;
};

export const instagramMediaCollection = "instagram_media";
export const instagramMediaTypes = ["IMAGE", "VIDEO", "CAROUSEL_ALBUM"] as const;
export const instagramMediaSources = ["manual", "instagram_api"] as const;

export type InstagramMediaType = (typeof instagramMediaTypes)[number];
export type InstagramMediaSource = (typeof instagramMediaSources)[number];

export type InstagramMediaItem = {
  id: string;
  externalId: string;
  mediaType: InstagramMediaType;
  caption: string;
  description: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
  hidden: boolean;
  featured: boolean;
  pinned: boolean;
  showOnHome: boolean;
  portfolioOnly: boolean;
  order: number | null;
  source: InstagramMediaSource;
  createdAt: string | null;
  updatedAt: string | null;
};

export type InstagramManualMediaInput = {
  externalId: string;
  mediaType: InstagramMediaType;
  caption: string;
  description: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
  hidden: boolean;
  featured: boolean;
  pinned: boolean;
  showOnHome: boolean;
  portfolioOnly: boolean;
  order: number | null;
};

const maxLengths = {
  externalId: 160,
  caption: 2_200,
  description: 500,
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cleanLongText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\r\n/g, "\n") : "";
}

function parseBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "on";
}

function parseOrder(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 9999 ? parsed : null;
}

function parseTimestamp(value: unknown): string | null {
  const rawValue = cleanString(value);
  if (!rawValue) return null;

  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseMediaType(value: unknown): InstagramMediaType | null {
  return instagramMediaTypes.includes(value as InstagramMediaType)
    ? (value as InstagramMediaType)
    : null;
}

function serializeDate(value: unknown): string | null {
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (value && typeof value === "object" && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return null;
}

function validateRequiredPublicUrl(
  value: unknown,
  fieldName: string,
  errors: Record<string, string>,
) {
  const sanitized = sanitizeExternalImageUrl(value);

  if (!sanitized) {
    errors[fieldName] = "Ingresa una URL pública http:// o https:// válida.";
    return null;
  }

  return sanitized;
}

function validateOptionalPublicUrl(
  value: unknown,
  fieldName: string,
  errors: Record<string, string>,
) {
  const rawValue = typeof value === "string" ? value.trim() : "";
  if (!rawValue) return null;

  const sanitized = sanitizeExternalImageUrl(rawValue);
  if (!sanitized) {
    errors[fieldName] = "Ingresa una URL pública http:// o https:// válida.";
    return null;
  }

  return sanitized;
}

type InstagramEnv = Partial<Record<string, string | undefined>>;

export function areInstagramApiCredentialsConfigured(env: InstagramEnv = process.env): boolean {
  return Boolean(
    env.INSTAGRAM_IG_USER_ID?.trim() &&
    env.INSTAGRAM_ACCESS_TOKEN?.trim() &&
    env.INSTAGRAM_APP_ID?.trim() &&
    env.INSTAGRAM_APP_SECRET?.trim(),
  );
}

export function getInstagramSyncDisabledMessage(env: InstagramEnv = process.env) {
  const missing = [
    ["INSTAGRAM_IG_USER_ID", env.INSTAGRAM_IG_USER_ID],
    ["INSTAGRAM_ACCESS_TOKEN", env.INSTAGRAM_ACCESS_TOKEN],
    ["INSTAGRAM_APP_ID", env.INSTAGRAM_APP_ID],
    ["INSTAGRAM_APP_SECRET", env.INSTAGRAM_APP_SECRET],
  ]
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key);

  return {
    message:
      "Sincronización de Instagram deshabilitada: faltan credenciales oficiales server-only. No se llamó a Instagram.",
    missing,
    endpoint: "/{ig-user-id}/media",
    requiredFields: [
      "id",
      "media_type",
      "media_url",
      "permalink",
      "thumbnail_url",
      "timestamp",
      "caption",
    ],
  };
}

export function validateManualInstagramMediaInput(input: unknown) {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const errors: Record<string, string> = {};
  const externalId =
    cleanString(data.externalId || data.external_id) || `manual-${crypto.randomUUID()}`;
  const mediaType = parseMediaType(data.mediaType || data.media_type);
  const caption = cleanLongText(data.caption);
  const description = cleanLongText(data.description) || caption.slice(0, maxLengths.description);
  const mediaUrl = validateRequiredPublicUrl(data.mediaUrl || data.media_url, "mediaUrl", errors);
  const thumbnailUrl = validateOptionalPublicUrl(
    data.thumbnailUrl || data.thumbnail_url,
    "thumbnailUrl",
    errors,
  );
  const permalink = validateOptionalPublicUrl(data.permalink, "permalink", errors);
  const timestamp = parseTimestamp(data.timestamp);
  const order = parseOrder(data.order);

  if (externalId.length > maxLengths.externalId)
    errors.externalId = "El ID externo es demasiado largo.";
  if (!mediaType) errors.mediaType = "El tipo debe ser IMAGE, VIDEO o CAROUSEL_ALBUM.";
  if (!caption) errors.caption = "Ingresa una descripción o caption.";
  if (caption.length > maxLengths.caption) errors.caption = "El caption es demasiado largo.";
  if (description.length > maxLengths.description) {
    errors.description = "La descripción es demasiado larga.";
  }
  if ((data.timestamp || data.timestamp === "") && !timestamp) {
    errors.timestamp = "Ingresa una fecha válida.";
  }
  if (data.order !== undefined && data.order !== "" && order === null) {
    errors.order = "El orden debe ser un entero entre 0 y 9999.";
  }

  if (Object.keys(errors).length > 0 || !mediaType || !mediaUrl) {
    return { ok: false as const, errors };
  }

  return {
    ok: true as const,
    value: {
      externalId,
      mediaType,
      caption,
      description,
      mediaUrl,
      thumbnailUrl,
      permalink,
      timestamp,
      hidden: parseBoolean(data.hidden),
      featured: parseBoolean(data.featured),
      pinned: parseBoolean(data.pinned ?? data.showOnHome ?? data.show_on_home),
      showOnHome: parseBoolean(data.showOnHome ?? data.show_on_home ?? data.pinned),
      portfolioOnly: parseBoolean(data.portfolioOnly ?? data.portfolio_only),
      order,
    } satisfies InstagramManualMediaInput,
  };
}

export function validateInstagramMediaUpdateInput(input: unknown) {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const errors: Record<string, string> = {};
  const updates: Record<string, unknown> = {};

  for (const [field, firestoreField] of [
    ["hidden", "hidden"],
    ["featured", "featured"],
    ["pinned", "pinned"],
    ["showOnHome", "show_on_home"],
    ["portfolioOnly", "portfolio_only"],
  ] as const) {
    if (field in data) updates[firestoreField] = parseBoolean(data[field]);
  }

  if ("order" in data) {
    const order = parseOrder(data.order);
    if (data.order !== "" && data.order !== null && order === null) {
      errors.order = "El orden debe ser un entero entre 0 y 9999.";
    } else {
      updates.order = order;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false as const, errors };
  if (Object.keys(updates).length === 0) {
    return { ok: false as const, errors: { form: "No hay cambios válidos para guardar." } };
  }

  return { ok: true as const, value: updates };
}

function mapManualInputToFirestore(input: InstagramManualMediaInput) {
  return {
    external_id: input.externalId,
    media_type: input.mediaType,
    caption: input.caption,
    description: input.description,
    media_url: input.mediaUrl,
    thumbnail_url: input.thumbnailUrl,
    permalink: input.permalink,
    timestamp: input.timestamp,
    hidden: input.hidden,
    featured: input.featured,
    pinned: input.pinned,
    show_on_home: input.showOnHome,
    portfolio_only: input.portfolioOnly,
    order: input.order,
    source: "manual" satisfies InstagramMediaSource,
  };
}

export async function createManualInstagramMedia(input: unknown, firestore: FirestoreLike) {
  const validation = validateManualInstagramMediaInput(input);
  if (!validation.ok) return { ok: false as const, status: 400, errors: validation.errors };

  const reference = firestore.collection(instagramMediaCollection).doc();
  await reference.set({
    ...mapManualInputToFirestore(validation.value),
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  return { ok: true as const, id: reference.id };
}

export async function updateInstagramMediaFlags(
  firestore: FirestoreLike,
  itemId: unknown,
  input: unknown,
) {
  const cleanItemId = cleanString(itemId);
  if (!/^[A-Za-z0-9_-]{6,120}$/.test(cleanItemId)) {
    return { ok: false as const, status: 400, error: "ID de media inválido." };
  }

  const validation = validateInstagramMediaUpdateInput(input);
  if (!validation.ok)
    return { ok: false as const, status: 400, error: Object.values(validation.errors)[0] };

  const reference = firestore.collection(instagramMediaCollection).doc(cleanItemId);
  const snapshot = await reference.get();
  if (!snapshot.exists) return { ok: false as const, status: 404, error: "La media no existe." };

  await reference.update({ ...validation.value, updated_at: FieldValue.serverTimestamp() });
  return { ok: true as const, itemId: cleanItemId };
}

export function mapFirestoreInstagramMedia(document: FirestoreDocumentLike): InstagramMediaItem {
  const data = document.data();
  const mediaType = parseMediaType(data.media_type) ?? "IMAGE";
  const source = instagramMediaSources.includes(data.source as InstagramMediaSource)
    ? (data.source as InstagramMediaSource)
    : "manual";
  const caption = cleanLongText(data.caption);
  const description = cleanLongText(data.description) || caption.slice(0, maxLengths.description);

  return {
    id: document.id,
    externalId: cleanString(data.external_id) || document.id,
    mediaType,
    caption,
    description,
    mediaUrl: sanitizeExternalImageUrl(data.media_url) ?? "",
    thumbnailUrl: sanitizeExternalImageUrl(data.thumbnail_url),
    permalink: sanitizeExternalImageUrl(data.permalink),
    timestamp: serializeDate(data.timestamp),
    hidden: data.hidden === true,
    featured: data.featured === true,
    pinned: data.pinned === true,
    showOnHome: data.show_on_home === true,
    portfolioOnly: data.portfolio_only === true,
    order: typeof data.order === "number" && Number.isFinite(data.order) ? data.order : null,
    source,
    createdAt: serializeDate(data.created_at),
    updatedAt: serializeDate(data.updated_at),
  };
}

export function sortInstagramMedia(items: InstagramMediaItem[]) {
  return [...items].sort((first, second) => {
    if (first.pinned !== second.pinned) return first.pinned ? -1 : 1;
    if (first.order !== second.order) return (first.order ?? 9999) - (second.order ?? 9999);
    return (second.timestamp ?? second.createdAt ?? "").localeCompare(
      first.timestamp ?? first.createdAt ?? "",
    );
  });
}

export async function listAdminInstagramMedia(firestore: FirestoreLike, limit = 24) {
  const snapshot = await firestore
    .collection(instagramMediaCollection)
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map(mapFirestoreInstagramMedia);
}

export async function listPublicInstagramMedia(firestore: FirestoreLike, limit = 24) {
  const snapshot = await firestore
    .collection(instagramMediaCollection)
    .where("hidden", "==", false)
    .limit(limit)
    .get();

  return sortInstagramMedia(snapshot.docs.map(mapFirestoreInstagramMedia)).filter(
    (item) => item.mediaUrl,
  );
}
