import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { randomBytes } from "node:crypto";
import {
  isExternalImageUploadConfigured,
  uploadImageToExternalProvider,
} from "@/lib/images/upload-provider";
import {
  CalendarDateUnavailableError,
  createQuoteWithOptionalDateReservation,
  getDateUnavailableError,
  releasePendingCalendarDateForQuote,
  type CalendarDateStatus,
} from "../calendar/reservation";
import { getFirebaseAdminFirestore, getFirebaseAdminStorageBucket } from "../firebase/admin";

export const preferredContactMethods = ["email", "phone", "whatsapp"] as const;
export const quoteStatuses = ["pending", "contacted", "closed", "spam"] as const;

export type PreferredContactMethod = (typeof preferredContactMethods)[number];
export type QuoteStatus = (typeof quoteStatuses)[number];
const quoteStatusesThatReleasePendingCalendarDate: readonly QuoteStatus[] = ["closed", "spam"];

export type QuoteRequestInput = {
  customerName: string;
  email: string;
  phone?: string;
  description: string;
  bodyPlacement: string;
  approximateSize: string;
  budgetClp?: number;
  preferredContactMethod: PreferredContactMethod;
  preferredTattooDate?: string;
  referenceUrls: string[];
  consents: {
    dataProcessing: true;
    imageHandling: true;
    privacyTerms: true;
    marketingOptIn: boolean;
  };
};

export type QuoteReferenceImageInput = {
  file: File;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

export type QuoteReferenceImage = {
  id: string;
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
  quoteCode: string;
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
  preferredTattooDate: string | null;
  calendarDateStatus: CalendarDateStatus | null;
  consents: {
    dataProcessing: boolean;
    imageHandling: boolean;
    privacyTerms: boolean;
    marketingOptIn: boolean;
  };
  internalNote: string;
  deposit: QuoteDepositSummary | null;
  referenceImages: QuoteReferenceImage[];
  referenceUrls: string[];
};

export type QuoteDepositInput = {
  amountClp: number;
  method: string;
  paidAt: string;
  reference?: string;
  internalNote?: string;
};

export type QuoteDepositSummary = {
  amountClp: number;
  method: string;
  paidAt: string;
  reference: string | null;
  verified: boolean;
  verifiedAt: string | null;
};

export type ClientQuoteStatus = {
  quoteCode: string;
  preferredTattooDate: string | null;
  status: string;
  calendarDateStatus: CalendarDateStatus | null;
  deposit: Pick<QuoteDepositSummary, "amountClp" | "paidAt" | "verified"> | null;
  publicMessage: string | null;
};

export const clientQuoteStatusLookupError =
  "No pudimos validar la solicitud con esos datos. Revisa el código y el email ingresados o contacta al estudio.";

type FirestoreLike = NonNullable<ReturnType<typeof getFirebaseAdminFirestore>>;
type StorageBucketLike = NonNullable<ReturnType<typeof getFirebaseAdminStorageBucket>>;
type TransactionLike = {
  get: (reference: unknown) => Promise<{ exists: boolean; data?: () => Record<string, unknown> }>;
  update: (reference: unknown, data: Record<string, unknown>) => unknown;
  set: (
    reference: unknown,
    data: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => unknown;
};

const maxLengths = {
  customerName: 80,
  email: 160,
  phone: 40,
  description: 1500,
  bodyPlacement: 120,
  approximateSize: 120,
  preferredTattooDate: 10,
  internalNote: 2000,
  depositMethod: 80,
  depositReference: 120,
  referenceUrl: 500,
};

export const referenceUrlConstraints = {
  maxUrls: 5,
  maxLength: maxLengths.referenceUrl,
  allowedProtocols: ["http:", "https:"],
} as const;

export const referenceImageConstraints = {
  maxFiles: 3,
  maxSizeBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
} as const;

export function areQuoteFileUploadsEnabled() {
  return isExternalImageUploadConfigured();
}

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

export function isValidQuoteCode(value: string): boolean {
  return /^COT-\d{4}-[A-F0-9]{5}$/.test(value.trim().toUpperCase());
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

function isChecked(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function isValidPreferredTattooDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parts = value.split("-").map(Number);
  const [year, month, day] = parts;

  if (parts.length !== 3 || year === undefined || month === undefined || day === undefined) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12));

  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parsePositiveInteger(value: unknown): number {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : Number.NaN;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return Number.NaN;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function collectReferenceUrlValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectReferenceUrlValues);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function validateQuoteReferenceUrls(value: unknown) {
  const rawUrls = collectReferenceUrlValues(value);
  const errors: Record<string, string> = {};

  if (rawUrls.length > referenceUrlConstraints.maxUrls) {
    errors.referenceUrls = `Puedes agregar hasta ${referenceUrlConstraints.maxUrls} enlaces de referencia.`;
  }

  const urls = rawUrls.map((rawUrl, index) => {
    const field = `referenceUrls.${index}`;

    if (rawUrl.length > referenceUrlConstraints.maxLength) {
      errors[field] = "El enlace de referencia es demasiado largo.";
      return null;
    }

    try {
      const parsed = new URL(rawUrl);
      if (
        !referenceUrlConstraints.allowedProtocols.includes(
          parsed.protocol as (typeof referenceUrlConstraints.allowedProtocols)[number],
        )
      ) {
        errors[field] = "El enlace debe comenzar con http:// o https://.";
        return null;
      }

      return parsed.href;
    } catch {
      errors[field] = "Ingresa un enlace de referencia válido.";
      return null;
    }
  });

  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors };
  }

  return { ok: true as const, value: urls.filter((url): url is string => Boolean(url)) };
}

export function validateQuoteDepositInput(input: unknown) {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const amountClp = parsePositiveInteger(data.amountClp);
  const method = cleanString(data.method);
  const paidAt = cleanString(data.paidAt);
  const reference = cleanString(data.reference);
  const internalNote = cleanLongText(data.internalNote);
  const errors: Record<string, string> = {};

  if (Number.isNaN(amountClp)) {
    errors.amountClp = "El abono debe ser un monto positivo en CLP.";
  }
  if (!method) {
    errors.method = "Indica el método de pago del abono.";
  }
  if (method.length > maxLengths.depositMethod) {
    errors.method = "El método de pago es demasiado largo.";
  }
  if (!paidAt || !isValidPreferredTattooDate(paidAt)) {
    errors.paidAt = "Ingresa una fecha de pago válida.";
  }
  if (reference.length > maxLengths.depositReference) {
    errors.reference = "La referencia del abono es demasiado larga.";
  }
  if (internalNote.length > maxLengths.internalNote) {
    errors.internalNote = "La nota interna es demasiado larga.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false as const, status: 400, errors };
  }

  return {
    ok: true as const,
    value: {
      amountClp,
      method,
      paidAt,
      reference: reference || undefined,
      internalNote: internalNote || undefined,
    } satisfies QuoteDepositInput,
  };
}

function hasArrayBuffer(value: unknown): value is { arrayBuffer: () => Promise<ArrayBuffer> } {
  return typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function";
}

function getFileName(file: File): string {
  return cleanString(file.name).replace(/[\\/]/g, "_") || "reference-image";
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
    errors.referenceImages = `Puedes adjuntar hasta ${referenceImageConstraints.maxFiles} imágenes.`;
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
  const preferredTattooDate = cleanString(data.preferredTattooDate);
  const referenceUrlValidation = validateQuoteReferenceUrls(data.referenceUrls);
  const budgetClp = parseBudgetClp(data.budgetClp);
  const dataProcessingConsent = isChecked(data.dataProcessingConsent);
  const imageHandlingConsent = isChecked(data.imageHandlingConsent);
  const privacyTermsConsent = isChecked(data.privacyTermsConsent);
  const marketingOptIn = isChecked(data.marketingOptIn);
  const errors: Record<string, string> = {};

  if (!customerName) errors.customerName = "Ingresa tu nombre.";
  if (customerName.length > maxLengths.customerName)
    errors.customerName = "El nombre es demasiado largo.";
  if (!email || !isValidEmail(email)) errors.email = "Ingresa un email válido.";
  if (email.length > maxLengths.email) errors.email = "El email es demasiado largo.";
  if (phone.length > maxLengths.phone) errors.phone = "El teléfono es demasiado largo.";
  if (!description) errors.description = "Cuéntanos la idea del tatuaje.";
  if (description.length > maxLengths.description)
    errors.description = "La descripción es demasiado larga.";
  if (!bodyPlacement) errors.bodyPlacement = "Indica la zona del cuerpo.";
  if (bodyPlacement.length > maxLengths.bodyPlacement) {
    errors.bodyPlacement = "La zona del cuerpo es demasiado larga.";
  }
  if (!approximateSize) errors.approximateSize = "Indica el tamaño aproximado.";
  if (approximateSize.length > maxLengths.approximateSize) {
    errors.approximateSize = "El tamaño aproximado es demasiado largo.";
  }
  if (!isPreferredContactMethod(preferredContactMethod)) {
    errors.preferredContactMethod = "Elige un método de contacto válido.";
  }
  if (preferredTattooDate && !isValidPreferredTattooDate(preferredTattooDate)) {
    errors.preferredTattooDate = "Ingresa una fecha tentativa válida en formato de Chile.";
  }
  if (!referenceUrlValidation.ok) {
    Object.assign(errors, referenceUrlValidation.errors);
  }
  if (Number.isNaN(budgetClp)) errors.budgetClp = "El presupuesto debe ser un número positivo.";
  if (!dataProcessingConsent) {
    errors.dataProcessingConsent =
      "Debes autorizar el uso de tus datos para gestionar la cotización.";
  }
  if (!imageHandlingConsent) {
    errors.imageHandlingConsent = "Debes aceptar el manejo privado de las imágenes enviadas.";
  }
  if (!privacyTermsConsent) {
    errors.privacyTermsConsent = "Debes aceptar las condiciones de privacidad y reserva.";
  }

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
      preferredTattooDate: preferredTattooDate || undefined,
      referenceUrls: referenceUrlValidation.ok ? referenceUrlValidation.value : [],
      consents: {
        dataProcessing: true,
        imageHandling: true,
        privacyTerms: true,
        marketingOptIn,
      },
    },
  };
}

export function mapQuoteRequestToFirestore(input: QuoteRequestInput, quoteCode: string) {
  return {
    quote_code: quoteCode,
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
    preferred_tattoo_date: input.preferredTattooDate ?? null,
    reference_urls: input.referenceUrls,
    consents: {
      data_processing: input.consents.dataProcessing,
      image_handling: input.consents.imageHandling,
      privacy_terms: input.consents.privacyTerms,
      marketing_opt_in: input.consents.marketingOptIn,
    },
    consent_recorded_at: FieldValue.serverTimestamp(),
    source: "public_quote_form",
  };
}

function generateQuoteCodeCandidate(now = new Date()) {
  const year = now.getFullYear();
  const token = randomBytes(4).toString("hex").slice(0, 5).toUpperCase();

  return `COT-${year}-${token}`;
}

async function generateUniqueQuoteCode(firestore: FirestoreLike) {
  const quotes = firestore.collection("quotes");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateQuoteCodeCandidate();
    const existing = await quotes.where("quote_code", "==", candidate).limit(1).get();

    if (existing.empty || existing.docs?.length === 0) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique quote code.");
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

  const quoteCode = await generateUniqueQuoteCode(firestore);
  const document = {
    ...mapQuoteRequestToFirestore(validation.value, quoteCode),
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
  try {
    const result = await createQuoteWithOptionalDateReservation(
      firestore,
      document,
      validation.value.preferredTattooDate,
    );

    return { ok: true as const, id: result.quoteId, quoteCode };
  } catch (error) {
    if (error instanceof CalendarDateUnavailableError) {
      return {
        ok: false as const,
        status: 409,
        errors: { preferredTattooDate: getDateUnavailableError() },
      };
    }

    throw error;
  }
}

export async function createQuoteRequestFromFormData(
  formData: FormData,
  firestore = getFirebaseAdminFirestore(),
  _storageBucket = getFirebaseAdminStorageBucket(),
  fileUploadsEnabled = areQuoteFileUploadsEnabled(),
) {
  void _storageBucket;
  const body = Object.fromEntries(
    Array.from(formData.entries()).filter(([, value]) => !(value instanceof File)),
  );
  const imageValidation = validateQuoteReferenceImages(
    formData.getAll("referenceImages").filter((value): value is File => value instanceof File),
  );

  if (!imageValidation.ok) {
    return { ok: false as const, status: 400, errors: imageValidation.errors };
  }

  if (!fileUploadsEnabled && imageValidation.value.length > 0) {
    return {
      ok: false as const,
      status: 503,
      errors: {
        referenceImages:
          "La carga de imágenes requiere configurar un proveedor externo de imágenes. Agrega enlaces de referencia o coordina el envío por WhatsApp mientras se configura.",
      },
    };
  }

  if (imageValidation.value.length === 0) {
    return createQuoteRequest(body, firestore);
  }

  return createQuoteRequestWithReferenceImages(body, imageValidation.value, firestore);
}

export async function createQuoteRequestWithReferenceImages(
  input: unknown,
  referenceImages: QuoteReferenceImageInput[],
  firestore = getFirebaseAdminFirestore(),
  _storageBucket: StorageBucketLike | null = getFirebaseAdminStorageBucket(),
) {
  void _storageBucket;
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

  const quoteCode = await generateUniqueQuoteCode(firestore);
  const document = {
    ...mapQuoteRequestToFirestore(validation.value, quoteCode),
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
  let quoteId: string;

  try {
    const reservation = await createQuoteWithOptionalDateReservation(
      firestore,
      document,
      validation.value.preferredTattooDate,
    );
    quoteId = reservation.quoteId;
  } catch (error) {
    if (error instanceof CalendarDateUnavailableError) {
      return {
        ok: false as const,
        status: 409,
        errors: { preferredTattooDate: getDateUnavailableError() },
      };
    }

    throw error;
  }

  const createdImageReferences: { delete: () => Promise<unknown> }[] = [];
  const operations = referenceImages.map(async (image, index) => {
    const upload = await uploadImageToExternalProvider(image.file, "quote-reference");
    if (!upload.ok) {
      throw Object.assign(new Error(Object.values(upload.errors)[0] ?? "Image upload failed"), {
        uploadResult: upload,
      });
    }

    const imageReference = await firestore.collection("quote_images").add({
      customer_id: "anonymous",
      quote_id: quoteId,
      provider: upload.image.provider,
      provider_id: upload.image.providerId,
      secure_url: upload.image.secureUrl,
      original_filename: `Referencia ${index + 1}`,
      mime_type: upload.image.mimeType,
      size_bytes: upload.image.sizeBytes,
      width: upload.image.width,
      height: upload.image.height,
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
      ...createdImageReferences.map((reference) => reference.delete()),
      firestore.collection("quotes").doc(quoteId).delete(),
      releasePendingCalendarDateForQuote(firestore, quoteId, validation.value.preferredTattooDate),
    ]);
    const uploadResult = (rejectedResult.reason as { uploadResult?: unknown })?.uploadResult;
    if (uploadResult && typeof uploadResult === "object" && "status" in uploadResult) {
      const typed = uploadResult as { status: number; errors: Record<string, string> };
      return { ok: false as const, status: typed.status, errors: typed.errors };
    }
    throw rejectedResult.reason;
  }

  return { ok: true as const, id: quoteId, quoteCode };
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

function serializeQuoteDeposit(value: unknown): QuoteDepositSummary | null {
  const deposit = value && typeof value === "object" ? (value as Record<string, unknown>) : null;

  if (!deposit || deposit.verified !== true) {
    return null;
  }

  const amountClp = typeof deposit.amount_clp === "number" ? deposit.amount_clp : Number.NaN;
  const method = cleanString(deposit.method);
  const paidAt = cleanString(deposit.paid_at);

  if (!Number.isInteger(amountClp) || amountClp <= 0 || !method || !paidAt) {
    return null;
  }

  return {
    amountClp,
    method,
    paidAt,
    reference: cleanString(deposit.reference) || null,
    verified: true,
    verifiedAt: serializeCreatedAt(deposit.verified_at),
  };
}

function preview(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";

  return text.length > 140 ? `${text.slice(0, 137)}…` : text;
}

function serializeQuoteReferenceUrls(value: unknown): string[] {
  return collectReferenceUrlValues(value)
    .slice(0, referenceUrlConstraints.maxUrls)
    .flatMap((rawUrl) => {
      const validation = validateQuoteReferenceUrls(rawUrl);
      return validation.ok ? validation.value : [];
    });
}

function buildReferenceImageAccessUrl(imageId: string): string | null {
  return isValidQuoteImageId(imageId)
    ? `/api/admin/quotes/images?imageId=${encodeURIComponent(imageId)}`
    : null;
}

function sanitizeProviderImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isValidQuoteImageStoragePath(value: string): boolean {
  return /^quote-images\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+$/.test(value);
}

function serializeQuoteImage(document: { id: string; data: () => Record<string, unknown> }) {
  const data = document.data();
  const secureUrl = sanitizeProviderImageUrl(data.secure_url);

  return {
    id: document.id,
    originalFilename: cleanString(data.original_filename) || "Referencia",
    mimeType: cleanString(data.mime_type),
    sizeBytes: typeof data.size_bytes === "number" ? data.size_bytes : 0,
    accessUrl: secureUrl ?? buildReferenceImageAccessUrl(document.id),
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
      quoteCode: cleanString(data.quote_code) || document.id,
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
      preferredTattooDate: cleanString(data.preferred_tattoo_date) || null,
      calendarDateStatus: (cleanString(data.calendar_date_status) as CalendarDateStatus) || null,
      consents: {
        dataProcessing: Boolean(
          (data.consents as Record<string, unknown> | undefined)?.data_processing,
        ),
        imageHandling: Boolean(
          (data.consents as Record<string, unknown> | undefined)?.image_handling,
        ),
        privacyTerms: Boolean(
          (data.consents as Record<string, unknown> | undefined)?.privacy_terms,
        ),
        marketingOptIn: Boolean(
          (data.consents as Record<string, unknown> | undefined)?.marketing_opt_in,
        ),
      },
      internalNote: cleanLongText(data.admin_note),
      deposit: serializeQuoteDeposit(data.deposit),
      referenceImages: referenceImagesByQuoteId.get(document.id) ?? [],
      referenceUrls: serializeQuoteReferenceUrls(data.reference_urls),
    };
  });
}

export function serializeClientQuoteStatus(
  quoteId: string,
  data: Record<string, unknown>,
): ClientQuoteStatus {
  const quoteCode = cleanString(data.quote_code) || quoteId;
  const deposit = serializeQuoteDeposit(data.deposit);

  return {
    quoteCode,
    preferredTattooDate:
      cleanString(data.preferred_tattoo_date) || cleanString(data.calendar_date_id) || null,
    status: cleanString(data.status) || "pending",
    calendarDateStatus: (cleanString(data.calendar_date_status) as CalendarDateStatus) || null,
    deposit: deposit
      ? { amountClp: deposit.amountClp, paidAt: deposit.paidAt, verified: deposit.verified }
      : null,
    publicMessage: cleanLongText(data.client_visible_message) || null,
  };
}

function normalizeEmail(value: unknown): string {
  return cleanString(value).toLowerCase();
}

export async function getClientQuoteStatusByCode(
  firestore: FirestoreLike,
  quoteCode: unknown,
  clientEmail: unknown,
) {
  const cleanQuoteCode = cleanString(quoteCode).toUpperCase();
  const cleanClientEmail = normalizeEmail(clientEmail);

  if (!cleanQuoteCode || !isValidQuoteCode(cleanQuoteCode) || !isValidEmail(cleanClientEmail)) {
    return {
      ok: false as const,
      status: 400,
      error: clientQuoteStatusLookupError,
    };
  }

  const snapshot = await firestore
    .collection("quotes")
    .where("quote_code", "==", cleanQuoteCode)
    .limit(1)
    .get();
  const document = snapshot.docs?.[0];

  if (!document) {
    return {
      ok: false as const,
      status: 404,
      error: clientQuoteStatusLookupError,
    };
  }

  const data = document.data();
  if (normalizeEmail(data.customer_email) !== cleanClientEmail) {
    return {
      ok: false as const,
      status: 404,
      error: clientQuoteStatusLookupError,
    };
  }

  return { ok: true as const, quote: serializeClientQuoteStatus(document.id, data) };
}

function getOwnedPendingCalendarDate(
  quoteData: Record<string, unknown>,
  calendarDateData: Record<string, unknown>,
  quoteId: string,
) {
  const quoteCode = cleanString(quoteData.quote_code);
  const calendarQuoteCode = cleanString(calendarDateData.quote_code);
  const calendarDateStatus = cleanString(calendarDateData.status);
  const isOwnedByQuote =
    calendarDateData.quote_id === quoteId &&
    (!calendarQuoteCode || (quoteCode !== "" && calendarQuoteCode === quoteCode));

  return isOwnedByQuote && calendarDateStatus === "PENDING_CONFIRMATION";
}

function getQuoteCalendarDateId(quoteData: Record<string, unknown>) {
  return cleanString(quoteData.calendar_date_id || quoteData.preferred_tattoo_date);
}

function isVerifiedDepositForDate(quoteData: Record<string, unknown>, calendarDateId: string) {
  const deposit =
    quoteData.deposit && typeof quoteData.deposit === "object"
      ? (quoteData.deposit as Record<string, unknown>)
      : null;

  return deposit?.verified === true && cleanString(deposit.calendar_date_id) === calendarDateId;
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

  const quoteReference = firestore.collection("quotes").doc(cleanQuoteId);
  const shouldReleasePendingDate =
    quoteStatusesThatReleasePendingCalendarDate.includes(cleanStatus);
  let calendarDateStatus: CalendarDateStatus | null = null;

  const result = await firestore.runTransaction(async (transaction) => {
    const transactionLike = transaction as TransactionLike;
    const quoteSnapshot = await transactionLike.get(quoteReference);

    if (!quoteSnapshot.exists) {
      return { ok: false as const, status: 404, error: "La solicitud no existe." };
    }

    const quoteData = quoteSnapshot.data?.() ?? {};
    const calendarDateId = getQuoteCalendarDateId(quoteData);
    const quoteUpdate: Record<string, unknown> = {
      status: cleanStatus,
      updated_at: FieldValue.serverTimestamp(),
    };

    if (shouldReleasePendingDate && calendarDateId) {
      const calendarDateReference = firestore.collection("calendar_dates").doc(calendarDateId);
      const calendarDateSnapshot = await transactionLike.get(calendarDateReference);
      const calendarDateData = calendarDateSnapshot.data?.() ?? {};
      if (
        calendarDateSnapshot.exists &&
        getOwnedPendingCalendarDate(quoteData, calendarDateData, cleanQuoteId)
      ) {
        calendarDateStatus = "RELEASED";
        quoteUpdate.calendar_date_status = calendarDateStatus;
        transactionLike.set(
          calendarDateReference,
          {
            ...calendarDateData,
            status: calendarDateStatus,
            released_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      } else {
        calendarDateStatus =
          (cleanString(quoteData.calendar_date_status) as CalendarDateStatus) || null;
      }
    } else {
      calendarDateStatus =
        (cleanString(quoteData.calendar_date_status) as CalendarDateStatus) || null;
    }

    transactionLike.update(quoteReference, quoteUpdate);

    return {
      ok: true as const,
      quoteId: cleanQuoteId,
      quoteStatus: cleanStatus,
      calendarDateStatus,
    };
  });

  return result;
}

export async function recordQuoteDeposit(
  firestore: FirestoreLike,
  quoteId: unknown,
  input: unknown,
  adminUid: unknown,
) {
  const cleanQuoteId = cleanString(quoteId);
  const cleanAdminUid = cleanString(adminUid);
  const validation = validateQuoteDepositInput(input);

  if (!cleanQuoteId) {
    return { ok: false as const, status: 400, error: "Falta el ID de la solicitud." };
  }

  if (!isValidQuoteId(cleanQuoteId)) {
    return { ok: false as const, status: 400, error: "ID de solicitud inválido." };
  }

  if (!validation.ok) {
    return validation;
  }

  const quoteReference = firestore.collection("quotes").doc(cleanQuoteId);

  return firestore.runTransaction(async (transaction) => {
    const transactionLike = transaction as TransactionLike;
    const quoteSnapshot = await transactionLike.get(quoteReference);

    if (!quoteSnapshot.exists) {
      return { ok: false as const, status: 404, error: "La solicitud no existe." };
    }

    const quoteData = quoteSnapshot.data?.() ?? {};
    const calendarDateId = getQuoteCalendarDateId(quoteData);

    if (!calendarDateId) {
      return {
        ok: false as const,
        status: 409,
        error: "La solicitud no tiene una fecha preferida pendiente para confirmar.",
      };
    }

    const calendarDateReference = firestore.collection("calendar_dates").doc(calendarDateId);
    const calendarDateSnapshot = await transactionLike.get(calendarDateReference);
    const calendarDateData = calendarDateSnapshot.data?.() ?? {};

    if (
      !calendarDateSnapshot.exists ||
      !getOwnedPendingCalendarDate(quoteData, calendarDateData, cleanQuoteId)
    ) {
      return {
        ok: false as const,
        status: 409,
        error: "La fecha preferida ya no está pendiente para esta cotización.",
      };
    }

    const deposit = {
      amount_clp: validation.value.amountClp,
      method: validation.value.method,
      paid_at: validation.value.paidAt,
      reference: validation.value.reference ?? null,
      internal_note: validation.value.internalNote ?? null,
      calendar_date_id: calendarDateId,
      verified: true,
      verified_by_admin_uid: cleanAdminUid || null,
      verified_at: FieldValue.serverTimestamp(),
    };

    transactionLike.update(quoteReference, {
      deposit,
      updated_at: FieldValue.serverTimestamp(),
    });

    return {
      ok: true as const,
      quoteId: cleanQuoteId,
      calendarDateStatus: cleanString(quoteData.calendar_date_status) || "PENDING_CONFIRMATION",
      deposit: {
        amountClp: validation.value.amountClp,
        method: validation.value.method,
        paidAt: validation.value.paidAt,
        reference: validation.value.reference ?? null,
        verified: true,
        verifiedAt: null,
      } satisfies QuoteDepositSummary,
    };
  });
}

export async function confirmQuoteReservation(firestore: FirestoreLike, quoteId: unknown) {
  const cleanQuoteId = cleanString(quoteId);

  if (!cleanQuoteId) {
    return { ok: false as const, status: 400, error: "Falta el ID de la solicitud." };
  }

  if (!isValidQuoteId(cleanQuoteId)) {
    return { ok: false as const, status: 400, error: "ID de solicitud inválido." };
  }

  const quoteReference = firestore.collection("quotes").doc(cleanQuoteId);

  return firestore.runTransaction(async (transaction) => {
    const transactionLike = transaction as TransactionLike;
    const quoteSnapshot = await transactionLike.get(quoteReference);

    if (!quoteSnapshot.exists) {
      return { ok: false as const, status: 404, error: "La solicitud no existe." };
    }

    const quoteData = quoteSnapshot.data?.() ?? {};
    const calendarDateId = getQuoteCalendarDateId(quoteData);

    if (!calendarDateId) {
      return {
        ok: false as const,
        status: 409,
        error: "La solicitud no tiene una fecha preferida para confirmar.",
      };
    }

    if (!isVerifiedDepositForDate(quoteData, calendarDateId)) {
      return {
        ok: false as const,
        status: 409,
        error: "No se puede confirmar la reserva sin un abono verificado para esta fecha.",
      };
    }

    const calendarDateReference = firestore.collection("calendar_dates").doc(calendarDateId);
    const calendarDateSnapshot = await transactionLike.get(calendarDateReference);
    const calendarDateData = calendarDateSnapshot.data?.() ?? {};

    if (
      !calendarDateSnapshot.exists ||
      !getOwnedPendingCalendarDate(quoteData, calendarDateData, cleanQuoteId)
    ) {
      return {
        ok: false as const,
        status: 409,
        error: "La fecha ya no está pendiente o pertenece a otra cotización.",
      };
    }

    const calendarDateStatus = "CONFIRMED" satisfies CalendarDateStatus;

    transactionLike.set(
      calendarDateReference,
      {
        ...calendarDateData,
        status: calendarDateStatus,
        confirmed_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    transactionLike.update(quoteReference, {
      calendar_date_status: calendarDateStatus,
      reservation_confirmed_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    return { ok: true as const, quoteId: cleanQuoteId, calendarDateStatus };
  });
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
