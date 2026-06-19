import { FieldValue } from "firebase-admin/firestore";
import { isFirebaseAdminBackendConfigured } from "../config/firebase-admin";
import { getFirebaseAdminFirestore, getFirebaseAdminStorageBucket } from "../firebase/admin";
import { mapFirestorePortfolioItem, type FirestorePortfolioItem } from "./portfolio";

type FirestoreLike = NonNullable<ReturnType<typeof getFirebaseAdminFirestore>>;

export type PortfolioImageInput = {
  file: File;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

export type PortfolioItemInput = {
  title: string;
  style: string;
  bodyArea: string;
  description: string;
  tags: string[];
  published: boolean;
};

export type PortfolioImageFile = {
  storagePath: string;
  originalFilename: string;
  mimeType: string;
};

export const portfolioImageConstraints = {
  maxSizeBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
} as const;

const maxLengths = {
  title: 100,
  style: 80,
  bodyArea: 80,
  description: 500,
  tag: 40,
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cleanLongText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\r\n/g, "\n") : "";
}

function parseTags(value: unknown): string[] {
  const rawTags = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];

  return [
    ...new Set(rawTags.map((tag) => cleanString(tag).toLocaleLowerCase("es-CL")).filter(Boolean)),
  ];
}

function isAllowedPortfolioImageMimeType(value: string): boolean {
  return portfolioImageConstraints.allowedMimeTypes.includes(
    value as (typeof portfolioImageConstraints.allowedMimeTypes)[number],
  );
}

function hasArrayBuffer(value: unknown): value is { arrayBuffer: () => Promise<ArrayBuffer> } {
  return typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function";
}

function getFileName(file: File): string {
  return cleanString(file.name).replace(/[\\/]/g, "_") || "portfolio-image";
}

function getFileExtension(fileName: string, mimeType: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension && /^[a-z0-9]{1,8}$/.test(extension)) {
    return extension;
  }

  return mimeType.split("/")[1] ?? "image";
}

export function validatePortfolioItemInput(input: unknown) {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const title = cleanString(data.title);
  const style = cleanString(data.style);
  const bodyArea = cleanString(data.bodyArea);
  const description = cleanLongText(data.description);
  const tags = parseTags(data.tags);
  const errors: Record<string, string> = {};

  if (!title) errors.title = "Ingresa un título.";
  if (title.length > maxLengths.title) errors.title = "El título es demasiado largo.";
  if (!style) errors.style = "Ingresa un estilo.";
  if (style.length > maxLengths.style) errors.style = "El estilo es demasiado largo.";
  if (!bodyArea) errors.bodyArea = "Ingresa una zona del cuerpo.";
  if (bodyArea.length > maxLengths.bodyArea) {
    errors.bodyArea = "La zona del cuerpo es demasiado larga.";
  }
  if (!description) errors.description = "Ingresa una descripción corta.";
  if (description.length > maxLengths.description) {
    errors.description = "La descripción es demasiado larga.";
  }
  if (tags.length > 8) errors.tags = "Usa hasta 8 etiquetas.";
  if (tags.some((tag) => tag.length > maxLengths.tag)) {
    errors.tags = "Cada etiqueta debe tener 40 caracteres o menos.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors };
  }

  return {
    ok: true as const,
    value: {
      title,
      style,
      bodyArea,
      description,
      tags,
      published: data.published === true || data.published === "true",
    } satisfies PortfolioItemInput,
  };
}

export function validatePortfolioImage(file: File | null) {
  if (!file || (!file.size && !file.name && !file.type)) {
    return { ok: true as const, value: null };
  }

  const errors: Record<string, string> = {};

  if (!hasArrayBuffer(file)) {
    errors.image = "El archivo no es válido.";
  }

  if (!isAllowedPortfolioImageMimeType(file.type)) {
    errors.image = "Solo se permiten imágenes JPG, PNG, WEBP o GIF.";
  }

  if (file.size <= 0) {
    errors.image = "La imagen está vacía.";
  }

  if (file.size > portfolioImageConstraints.maxSizeBytes) {
    errors.image = "La imagen debe pesar 5 MB o menos.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors };
  }

  return {
    ok: true as const,
    value: {
      file,
      originalFilename: getFileName(file),
      mimeType: file.type,
      sizeBytes: file.size,
    } satisfies PortfolioImageInput,
  };
}

export function mapPortfolioItemToFirestore(input: PortfolioItemInput) {
  return {
    artist_id: "admin",
    title: input.title,
    style: input.style,
    body_area: input.bodyArea,
    description: input.description,
    tags: input.tags,
    published: input.published,
  };
}

export async function createPortfolioItemFromFormData(
  formData: FormData,
  firestore = getFirebaseAdminFirestore(),
  storageBucket = getFirebaseAdminStorageBucket(),
) {
  const body = Object.fromEntries(
    Array.from(formData.entries()).filter(([, value]) => !(value instanceof File)),
  );
  const validation = validatePortfolioItemInput(body);
  const imageValidation = validatePortfolioImage(
    formData.get("image") instanceof File ? (formData.get("image") as File) : null,
  );

  if (!validation.ok) return { ok: false as const, status: 400, errors: validation.errors };
  if (!imageValidation.ok)
    return { ok: false as const, status: 400, errors: imageValidation.errors };

  if (!firestore) {
    return {
      ok: false as const,
      status: 503,
      errors: { form: "Firebase Admin no está configurado." },
    };
  }

  if (imageValidation.value && !storageBucket) {
    return {
      ok: false as const,
      status: 503,
      errors: { form: "Firebase Storage no está configurado." },
    };
  }

  const reference = firestore.collection("portfolio_items").doc();
  let imageMetadata = {};
  let uploadedPath: string | null = null;

  try {
    if (imageValidation.value && storageBucket) {
      const extension = getFileExtension(
        imageValidation.value.originalFilename,
        imageValidation.value.mimeType,
      );
      uploadedPath = `portfolio-admin/${reference.id}/main.${extension}`;
      const buffer = Buffer.from(await imageValidation.value.file.arrayBuffer());

      await storageBucket.file(uploadedPath).save(buffer, {
        contentType: imageValidation.value.mimeType,
        metadata: {
          metadata: {
            portfolio_item_id: reference.id,
            original_filename: imageValidation.value.originalFilename,
          },
        },
      });

      imageMetadata = {
        image_path: uploadedPath,
        image_original_filename: imageValidation.value.originalFilename,
        image_mime_type: imageValidation.value.mimeType,
        image_size_bytes: imageValidation.value.sizeBytes,
      };
    }

    await reference.set({
      ...mapPortfolioItemToFirestore(validation.value),
      ...imageMetadata,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if (uploadedPath && storageBucket) {
      await storageBucket
        .file(uploadedPath)
        .delete()
        .catch(() => undefined);
    }
    throw error;
  }

  return { ok: true as const, id: reference.id };
}

export async function listRecentAdminPortfolioItems(firestore: FirestoreLike, limit = 12) {
  const snapshot = await firestore
    .collection("portfolio_items")
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((document) => mapFirestorePortfolioItem(document));
}

export async function listPublishedFirestorePortfolioItems(
  firestore?: FirestoreLike | null,
): Promise<FirestorePortfolioItem[]> {
  try {
    if (firestore === undefined && !isFirebaseAdminBackendConfigured()) {
      return [];
    }

    const portfolioFirestore = firestore ?? getFirebaseAdminFirestore();

    if (!portfolioFirestore) {
      return [];
    }

    const snapshot = await portfolioFirestore
      .collection("portfolio_items")
      .where("published", "==", true)
      .limit(24)
      .get();

    return snapshot.docs.map((document) => mapFirestorePortfolioItem(document));
  } catch {
    return [];
  }
}

export async function updatePortfolioPublishedStatus(
  firestore: FirestoreLike,
  itemId: unknown,
  published: unknown,
) {
  const cleanItemId = cleanString(itemId);

  if (!/^[A-Za-z0-9_-]{6,120}$/.test(cleanItemId)) {
    return { ok: false as const, status: 400, error: "ID de portafolio inválido." };
  }

  if (typeof published !== "boolean") {
    return { ok: false as const, status: 400, error: "Estado de publicación inválido." };
  }

  const reference = firestore.collection("portfolio_items").doc(cleanItemId);
  const snapshot = await reference.get();

  if (!snapshot.exists) {
    return { ok: false as const, status: 404, error: "El ítem de portafolio no existe." };
  }

  await reference.update({ published, updated_at: FieldValue.serverTimestamp() });

  return { ok: true as const, itemId: cleanItemId, published };
}

export async function getPublishedPortfolioImageFile(firestore: FirestoreLike, itemId: unknown) {
  const cleanItemId = cleanString(itemId);

  if (!/^[A-Za-z0-9_-]{6,120}$/.test(cleanItemId)) {
    return { ok: false as const, status: 400, error: "ID de portafolio inválido." };
  }

  const snapshot = await firestore.collection("portfolio_items").doc(cleanItemId).get();

  if (!snapshot.exists) {
    return { ok: false as const, status: 404, error: "La imagen no existe." };
  }

  const data = snapshot.data() ?? {};
  const storagePath = cleanString(data.image_path);
  const mimeType = cleanString(data.image_mime_type);
  const originalFilename = cleanString(data.image_original_filename) || "portfolio-image";

  if (
    data.published !== true ||
    !storagePath ||
    !mimeType ||
    !isAllowedPortfolioImageMimeType(mimeType)
  ) {
    return { ok: false as const, status: 404, error: "La imagen no existe." };
  }

  if (!new RegExp(`^portfolio-admin/${cleanItemId}/[^/]+$`).test(storagePath)) {
    return { ok: false as const, status: 422, error: "La metadata de imagen es inválida." };
  }

  return {
    ok: true as const,
    file: { storagePath, originalFilename, mimeType } satisfies PortfolioImageFile,
  };
}

export async function getAdminPortfolioImageFile(firestore: FirestoreLike, itemId: unknown) {
  const cleanItemId = cleanString(itemId);

  if (!/^[A-Za-z0-9_-]{6,120}$/.test(cleanItemId)) {
    return { ok: false as const, status: 400, error: "ID de portafolio inválido." };
  }

  const snapshot = await firestore.collection("portfolio_items").doc(cleanItemId).get();

  if (!snapshot.exists) {
    return { ok: false as const, status: 404, error: "La imagen no existe." };
  }

  const data = snapshot.data() ?? {};
  const storagePath = cleanString(data.image_path);
  const mimeType = cleanString(data.image_mime_type);
  const originalFilename = cleanString(data.image_original_filename) || "portfolio-image";

  if (!storagePath || !mimeType || !isAllowedPortfolioImageMimeType(mimeType)) {
    return { ok: false as const, status: 404, error: "La imagen no existe." };
  }

  if (!new RegExp(`^portfolio-admin/${cleanItemId}/[^/]+$`).test(storagePath)) {
    return { ok: false as const, status: 422, error: "La metadata de imagen es inválida." };
  }

  return {
    ok: true as const,
    file: { storagePath, originalFilename, mimeType } satisfies PortfolioImageFile,
  };
}
