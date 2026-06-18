import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore, getFirebaseAdminStorageBucket } from "../firebase/admin";

export const preferredContactMethods = ["email", "phone", "whatsapp"] as const;
export const quoteStatuses = ["pending", "contacted", "closed", "spam"] as const;

export type PreferredContactMethod = (typeof preferredContactMethods)[number];
export type QuoteStatus = (typeof quoteStatuses)[number];

export type QuoteRequestInput = {
  customerName: string;
  email: string;
  phone?: string;
  description: string;
  bodyPlacement: string;
  approximateSize: string;
  budgetClp?: number;
  preferredContactMethod: PreferredContactMethod;
};

export type QuoteReferenceImageInput = {
  file: File;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

export type QuoteReferenceImage = {
  id: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  accessUrl: string | null;
};

export type AdminQuoteReferenceImageFile = {
  storagePath: string;
  originalFilename: string;
  mimeType: string;
};

export type QuoteRequestValidationResult =
  | { ok: true; value: QuoteRequestInput }
  | { ok: false; errors: Record<string, string> };

export type RecentQuoteRequest = {
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
  referenceImages: QuoteReferenceImage[];
};

type FirestoreLike = NonNullable<ReturnType<typeof getFirebaseAdminFirestore>>;
type StorageBucketLike = NonNullable<ReturnType<typeof getFirebaseAdminStorageBucket>>;

const maxLengths = {
  customerName: 80,
  email: 160,
  phone: 40,
  description: 1500,
  bodyPlacement: 120,
  approximateSize: 120,
  internalNote: 2000,
};

export const referenceImageConstraints = {
  maxFiles: 3,
  maxSizeBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
} as const;

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cleanLongText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\r\n/g, "\n") : "";
}

function isPreferredContactMethod(value: string): value is PreferredContactMethod {
  return preferredContactMethods.includes(value as PreferredContactMethod);
}

export function isQuoteStatus(value: string): value is QuoteStatus {
  return quoteStatuses.includes(value as QuoteStatus);
}

function isValidQuoteId(value: string): boolean {
  return /^[A-Za-z0-9_-]{6,80}$/.test(value);
}

function isValidQuoteImageId(value: string): boolean {
  return /^[A-Za-z0-9_-]{6,120}$/.test(value);
}

export function validateQuoteInternalNoteInput(quoteId: unknown, internalNote: unknown) {
  const cleanQuoteId = cleanString(quoteId);
  const cleanInternalNote = cleanLongText(internalNote);

  if (!cleanQuoteId) {
    return { ok: false as const, status: 400, error: "Falta el ID de la solicitud." };
  }

  if (!isValidQuoteId(cleanQuoteId)) {
    return { ok: false as const, status: 400, error: "ID de solicitud inválido." };
  }

  if (typeof internalNote !== "string") {
    return { ok: false as const, status: 400, error: "La nota interna debe ser texto." };
  }

  if (cleanInternalNote.length > maxLengths.internalNote) {
    return { ok: false as const, status: 400, error: "La nota interna es demasiado larga." };
  }

  return { ok: true as const, quoteId: cleanQuoteId, internalNote: cleanInternalNote };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasArrayBuffer(value: unknown): value is { arrayBuffer: () => Promise<ArrayBuffer> } {
  return typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function";
}

function getFileName(file: File): string {
  return cleanString(file.name).replace(/[\\/]/g, "_") || "reference-image";
}

function getFileExtension(fileName: string, mimeType: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension && /^[a-z0-9]{1,8}$/.test(extension)) {
    return extension;
  }

  return mimeType.split("/")[1] ?? "image";
}

function isAllowedReferenceImageMimeType(value: string): boolean {
  return referenceImageConstraints.allowedMimeTypes.includes(
    value as (typeof referenceImageConstraints.allowedMimeTypes)[number],
  );
}

export function validateQuoteReferenceImages(files: File[]) {
  const referenceImages = files.filter((file) => file.size > 0 || file.name || file.type);
  const errors: Record<string, string> = {};

  if (referenceImages.length > referenceImageConstraints.maxFiles) {
    errors.referenceImages = `Podés adjuntar hasta ${referenceImageConstraints.maxFiles} imágenes.`;
  }

  referenceImages.forEach((file, index) => {
    const field = `referenceImages.${index}`;

    if (!hasArrayBuffer(file)) {
      errors[field] = "El archivo adjunto no es válido.";
      return;
    }

    if (!isAllowedReferenceImageMimeType(file.type)) {
      errors[field] = "Solo se permiten imágenes JPG, PNG, WEBP o GIF.";
    }

    if (file.size <= 0) {
      errors[field] = "La imagen está vacía.";
    }

    if (file.size > referenceImageConstraints.maxSizeBytes) {
      errors[field] = "Cada imagen debe pesar 5 MB o menos.";
    }
  });

  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors };
  }

  return {
    ok: true as const,
    value: referenceImages.map((file) => ({
      file,
      originalFilename: getFileName(file),
      mimeType: file.type,
      sizeBytes: file.size,
    })),
  };
}

function parseBudgetClp(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(String(value).replace(/\D/g, ""));

  return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
}

export function validateQuoteRequestInput(input: unknown): QuoteRequestValidationResult {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const customerName = cleanString(data.customerName);
  const email = cleanString(data.email).toLowerCase();
  const phone = cleanString(data.phone);
  const description = cleanLongText(data.description);
  const bodyPlacement = cleanString(data.bodyPlacement);
  const approximateSize = cleanString(data.approximateSize);
  const preferredContactMethod = cleanString(data.preferredContactMethod);
  const budgetClp = parseBudgetClp(data.budgetClp);
  const errors: Record<string, string> = {};

  if (!customerName) errors.customerName = "Ingresá tu nombre.";
  if (customerName.length > maxLengths.customerName)
    errors.customerName = "El nombre es demasiado largo.";
  if (!email || !isValidEmail(email)) errors.email = "Ingresá un email válido.";
  if (email.length > maxLengths.email) errors.email = "El email es demasiado largo.";
  if (phone.length > maxLengths.phone) errors.phone = "El teléfono es demasiado largo.";
  if (!description) errors.description = "Contanos la idea del tatuaje.";
  if (description.length > maxLengths.description)
    errors.description = "La descripción es demasiado larga.";
  if (!bodyPlacement) errors.bodyPlacement = "Indicá la zona del cuerpo.";
  if (bodyPlacement.length > maxLengths.bodyPlacement) {
    errors.bodyPlacement = "La zona del cuerpo es demasiado larga.";
  }
  if (!approximateSize) errors.approximateSize = "Indicá el tamaño aproximado.";
  if (approximateSize.length > maxLengths.approximateSize) {
    errors.approximateSize = "El tamaño aproximado es demasiado largo.";
  }
  if (!isPreferredContactMethod(preferredContactMethod)) {
    errors.preferredContactMethod = "Elegí un método de contacto válido.";
  }
  if (Number.isNaN(budgetClp)) errors.budgetClp = "El presupuesto debe ser un número positivo.";

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      customerName,
      email,
      phone: phone || undefined,
      description,
      bodyPlacement,
      approximateSize,
      budgetClp,
      preferredContactMethod: preferredContactMethod as PreferredContactMethod,
    },
  };
}

export function mapQuoteRequestToFirestore(input: QuoteRequestInput) {
  return {
    customer_id: "anonymous",
    customer_name: input.customerName,
    customer_email: input.email,
    customer_phone: input.phone ?? null,
    preferred_contact_method: input.preferredContactMethod,
    status: "pending",
    body_area: input.bodyPlacement,
    size_description: input.approximateSize,
    description: input.description,
    budget_clp: input.budgetClp ?? null,
    source: "public_quote_form",
  };
}

export async function createQuoteRequest(input: unknown, firestore = getFirebaseAdminFirestore()) {
  const validation = validateQuoteRequestInput(input);

  if (!validation.ok) {
    return { ok: false as const, status: 400, errors: validation.errors };
  }

  if (!firestore) {
    return {
      ok: false as const,
      status: 503,
      errors: { form: "Firebase Admin no está configurado." },
    };
  }

  const document = {
    ...mapQuoteRequestToFirestore(validation.value),
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
  const reference = await firestore.collection("quotes").add(document);

  return { ok: true as const, id: reference.id };
}

export async function createQuoteRequestFromFormData(
  formData: FormData,
  firestore = getFirebaseAdminFirestore(),
  storageBucket = getFirebaseAdminStorageBucket(),
) {
  const body = Object.fromEntries(
    Array.from(formData.entries()).filter(([, value]) => !(value instanceof File)),
  );
  const imageValidation = validateQuoteReferenceImages(
    formData.getAll("referenceImages").filter((value): value is File => value instanceof File),
  );

  if (!imageValidation.ok) {
    return { ok: false as const, status: 400, errors: imageValidation.errors };
  }

  if (imageValidation.value.length === 0) {
    return createQuoteRequest(body, firestore);
  }

  if (!storageBucket) {
    return {
      ok: false as const,
      status: 503,
      errors: { form: "Firebase Storage no está configurado." },
    };
  }

  return createQuoteRequestWithReferenceImages(
    body,
    imageValidation.value,
    firestore,
    storageBucket,
  );
}

export async function createQuoteRequestWithReferenceImages(
  input: unknown,
  referenceImages: QuoteReferenceImageInput[],
  firestore = getFirebaseAdminFirestore(),
  storageBucket: StorageBucketLike | null = getFirebaseAdminStorageBucket(),
) {
  const validation = validateQuoteRequestInput(input);

  if (!validation.ok) {
    return { ok: false as const, status: 400, errors: validation.errors };
  }

  if (!firestore) {
    return {
      ok: false as const,
      status: 503,
      errors: { form: "Firebase Admin no está configurado." },
    };
  }

  if (referenceImages.length === 0) {
    return createQuoteRequest(input, firestore);
  }

  if (!storageBucket) {
    return {
      ok: false as const,
      status: 503,
      errors: { form: "Firebase Storage no está configurado." },
    };
  }

  const quoteReference = await firestore.collection("quotes").add({
    ...mapQuoteRequestToFirestore(validation.value),
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  const uploadedPaths: string[] = [];
  const createdImageReferences: { delete: () => Promise<unknown> }[] = [];
  const createdAt = Date.now();
  const operations = referenceImages.map(async (image, index) => {
    const extension = getFileExtension(image.originalFilename, image.mimeType);
    const storagePath = `quote-images/anonymous/${quoteReference.id}/${createdAt}-${index}.${extension}`;
    const buffer = Buffer.from(await image.file.arrayBuffer());

    await storageBucket.file(storagePath).save(buffer, {
      contentType: image.mimeType,
      metadata: {
        metadata: {
          customer_id: "anonymous",
          quote_id: quoteReference.id,
          original_filename: image.originalFilename,
        },
      },
    });
    uploadedPaths.push(storagePath);

    const imageReference = await firestore.collection("quote_images").add({
      customer_id: "anonymous",
      quote_id: quoteReference.id,
      storage_path: storagePath,
      original_filename: image.originalFilename,
      mime_type: image.mimeType,
      size_bytes: image.sizeBytes,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
    createdImageReferences.push(imageReference);
  });

  const results = await Promise.allSettled(operations);
  const rejectedResult = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  if (rejectedResult) {
    await Promise.allSettled([
      ...uploadedPaths.map((path) => storageBucket.file(path).delete()),
      ...createdImageReferences.map((reference) => reference.delete()),
      quoteReference.delete(),
    ]);
    throw rejectedResult.reason;
  }

  return { ok: true as const, id: quoteReference.id };
}

function serializeCreatedAt(value: unknown): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return null;
}

function preview(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";

  return text.length > 140 ? `${text.slice(0, 137)}…` : text;
}

function buildReferenceImageAccessUrl(imageId: string): string | null {
  return isValidQuoteImageId(imageId)
    ? `/api/admin/quotes/images?imageId=${encodeURIComponent(imageId)}`
    : null;
}

function isValidQuoteImageStoragePath(value: string): boolean {
  return /^quote-images\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+$/.test(value);
}

function serializeQuoteImage(document: { id: string; data: () => Record<string, unknown> }) {
  const data = document.data();
  const storagePath = cleanString(data.storage_path);

  return {
    id: document.id,
    storagePath,
    originalFilename: cleanString(data.original_filename) || "Referencia",
    mimeType: cleanString(data.mime_type),
    sizeBytes: typeof data.size_bytes === "number" ? data.size_bytes : 0,
    accessUrl: buildReferenceImageAccessUrl(document.id),
  } satisfies QuoteReferenceImage;
}

export async function getAdminQuoteReferenceImageFile(
  firestore: FirestoreLike,
  imageId: unknown,
  quoteId?: unknown,
) {
  const cleanImageId = cleanString(imageId);
  const cleanQuoteId = quoteId === undefined ? undefined : cleanString(quoteId);

  if (!cleanImageId) {
    return { ok: false as const, status: 400, error: "Falta el ID de la imagen." };
  }

  if (!isValidQuoteImageId(cleanImageId)) {
    return { ok: false as const, status: 400, error: "ID de imagen inválido." };
  }

  if (cleanQuoteId !== undefined && !isValidQuoteId(cleanQuoteId)) {
    return { ok: false as const, status: 400, error: "ID de solicitud inválido." };
  }

  const snapshot = await firestore.collection("quote_images").doc(cleanImageId).get();

  if (!snapshot.exists) {
    return { ok: false as const, status: 404, error: "La imagen no existe." };
  }

  const data = snapshot.data() ?? {};
  const storagePath = cleanString(data.storage_path);
  const mimeType = cleanString(data.mime_type);
  const originalFilename = cleanString(data.original_filename) || "reference-image";
  const imageQuoteId = cleanString(data.quote_id);

  if (cleanQuoteId !== undefined && imageQuoteId !== cleanQuoteId) {
    return { ok: false as const, status: 404, error: "La imagen no existe." };
  }

  if (
    !storagePath ||
    !isValidQuoteImageStoragePath(storagePath) ||
    !mimeType ||
    !isAllowedReferenceImageMimeType(mimeType)
  ) {
    return { ok: false as const, status: 422, error: "La metadata de imagen es inválida." };
  }

  return {
    ok: true as const,
    file: { storagePath, originalFilename, mimeType } satisfies AdminQuoteReferenceImageFile,
  };
}

async function listReferenceImagesByQuoteId(firestore: FirestoreLike, quoteIds: string[]) {
  if (quoteIds.length === 0) {
    return new Map<string, QuoteReferenceImage[]>();
  }

  const imagesByQuoteId = new Map<string, QuoteReferenceImage[]>();

  await Promise.all(
    quoteIds.map(async (quoteId) => {
      const snapshot = await firestore
        .collection("quote_images")
        .where("quote_id", "==", quoteId)
        .get();
      imagesByQuoteId.set(
        quoteId,
        snapshot.docs.map((document) => serializeQuoteImage(document)),
      );
    }),
  );

  return imagesByQuoteId;
}

export async function listRecentQuoteRequests(firestore: FirestoreLike, limit = 20) {
  const snapshot = await firestore
    .collection("quotes")
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();

  const referenceImagesByQuoteId = await listReferenceImagesByQuoteId(
    firestore,
    snapshot.docs.map((document) => document.id),
  );

  return snapshot.docs.map((document): RecentQuoteRequest => {
    const data = document.data();

    return {
      id: document.id,
      createdAt: serializeCreatedAt(data.created_at),
      customerName: cleanString(data.customer_name) || "Sin nombre",
      email: cleanString(data.customer_email),
      phone: cleanString(data.customer_phone) || null,
      status: cleanString(data.status) || "pending",
      preferredContactMethod: cleanString(data.preferred_contact_method) || "email",
      bodyPlacement: cleanString(data.body_area),
      approximateSize: cleanString(data.size_description),
      description: cleanLongText(data.description),
      descriptionPreview: preview(data.description),
      budgetClp: typeof data.budget_clp === "number" ? data.budget_clp : null,
      internalNote: cleanLongText(data.admin_note),
      referenceImages: referenceImagesByQuoteId.get(document.id) ?? [],
    };
  });
}

export async function updateQuoteRequestStatus(
  firestore: FirestoreLike,
  quoteId: unknown,
  status: unknown,
) {
  const cleanQuoteId = cleanString(quoteId);
  const cleanStatus = cleanString(status);

  if (!cleanQuoteId) {
    return { ok: false as const, status: 400, error: "Falta el ID de la solicitud." };
  }

  if (!isValidQuoteId(cleanQuoteId)) {
    return { ok: false as const, status: 400, error: "ID de solicitud inválido." };
  }

  if (!isQuoteStatus(cleanStatus)) {
    return { ok: false as const, status: 400, error: "Estado de cotización no permitido." };
  }

  const reference = firestore.collection("quotes").doc(cleanQuoteId);
  const snapshot = await reference.get();

  if (!snapshot.exists) {
    return { ok: false as const, status: 404, error: "La solicitud no existe." };
  }

  await reference.update({
    status: cleanStatus,
    updated_at: FieldValue.serverTimestamp(),
  });

  return { ok: true as const, quoteId: cleanQuoteId, quoteStatus: cleanStatus };
}

export async function updateQuoteRequestInternalNote(
  firestore: FirestoreLike,
  quoteId: unknown,
  internalNote: unknown,
) {
  const validation = validateQuoteInternalNoteInput(quoteId, internalNote);

  if (!validation.ok) {
    return validation;
  }

  const reference = firestore.collection("quotes").doc(validation.quoteId);
  const snapshot = await reference.get();

  if (!snapshot.exists) {
    return { ok: false as const, status: 404, error: "La solicitud no existe." };
  }

  await reference.update({
    admin_note: validation.internalNote,
    updated_at: FieldValue.serverTimestamp(),
  });

  return {
    ok: true as const,
    quoteId: validation.quoteId,
    internalNote: validation.internalNote,
  };
}
