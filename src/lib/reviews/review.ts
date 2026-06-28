import { createHash, randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { reviewModerationStatuses, type ReviewModerationStatus } from "./review-constants";

export { reviewModerationStatuses, type ReviewModerationStatus } from "./review-constants";

export type PublicReview = {
  id: string;
  rating: number;
  comment: string;
  publicName: string;
  createdAt: string | null;
};

export type AdminReview = PublicReview & {
  moderationStatus: ReviewModerationStatus;
  publishConsent: boolean;
  quoteId: string | null;
  customerEmail: string | null;
  updatedAt: string | null;
};

type FirestoreLike = NonNullable<ReturnType<typeof getFirebaseAdminFirestore>>;
type ReviewTokenStatus = "unused" | "used";
type TransactionLike = {
  get: (reference: unknown) => Promise<{ exists: boolean; data?: () => Record<string, unknown> }>;
  set: (
    reference: unknown,
    data: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => unknown;
  update: (reference: unknown, data: Record<string, unknown>) => unknown;
};

const maxLengths = {
  token: 200,
  comment: 1200,
  publicName: 80,
  quoteId: 80,
  email: 160,
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cleanLongText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\r\n/g, "\n") : "";
}

function isChecked(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidSafeId(value: string): boolean {
  return /^[A-Za-z0-9_-]{3,80}$/.test(value);
}

function serializeDate(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

export function hashReviewToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function generateReviewTokenSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function isReviewModerationStatus(value: string): value is ReviewModerationStatus {
  return reviewModerationStatuses.includes(value as ReviewModerationStatus);
}

export function validateReviewSubmissionInput(input: unknown) {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const token = cleanString(data.token);
  const rating = typeof data.rating === "number" ? data.rating : Number(data.rating);
  const comment = cleanLongText(data.comment);
  const publicName = cleanString(data.publicName || data.public_name);
  const publishConsent = isChecked(data.publishConsent ?? data.publish_consent);
  const errors: Record<string, string> = {};

  if (!token || token.length > maxLengths.token)
    errors.token = "El enlace de opinión no es válido.";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = "La calificación debe estar entre 1 y 5.";
  }
  if (!comment || comment.length > maxLengths.comment) {
    errors.comment = "Escribe un comentario de hasta 1200 caracteres.";
  }
  if (!publicName || publicName.length > maxLengths.publicName) {
    errors.publicName = "Indica un nombre público o iniciales.";
  }
  if (!publishConsent) {
    errors.publishConsent = "Debes autorizar la publicación de tu opinión.";
  }

  return Object.keys(errors).length > 0
    ? { ok: false as const, errors }
    : { ok: true as const, value: { token, rating, comment, publicName, publishConsent } };
}

export function validateReviewTokenGenerationInput(input: unknown) {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const quoteId = cleanString(data.quoteId || data.quote_id);
  const customerEmail = cleanString(data.customerEmail || data.customer_email).toLowerCase();
  const expiresAt = cleanString(data.expiresAt || data.expires_at);
  const errors: Record<string, string> = {};

  if (quoteId && (!isValidSafeId(quoteId) || quoteId.length > maxLengths.quoteId)) {
    errors.quoteId = "ID de cotización inválido.";
  }
  if (customerEmail && (customerEmail.length > maxLengths.email || !isValidEmail(customerEmail))) {
    errors.customerEmail = "Email de cliente inválido.";
  }
  if (!quoteId && !customerEmail) {
    errors.context = "Agrega una cotización o un email/contexto manual del cliente.";
  }
  if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
    errors.expiresAt = "Fecha de expiración inválida.";
  }

  return Object.keys(errors).length > 0
    ? { ok: false as const, errors }
    : {
        ok: true as const,
        value: {
          quoteId: quoteId || null,
          customerEmail: customerEmail || null,
          expiresAt: expiresAt || null,
        },
      };
}

function serializePublicReview(document: {
  id: string;
  data: () => Record<string, unknown>;
}): PublicReview {
  const data = document.data();
  return {
    id: document.id,
    rating: typeof data.rating === "number" ? data.rating : 0,
    comment: cleanLongText(data.comment),
    publicName: cleanString(data.public_name) || "Cliente",
    createdAt: serializeDate(data.created_at),
  };
}

function serializeAdminReview(document: {
  id: string;
  data: () => Record<string, unknown>;
}): AdminReview {
  const data = document.data();
  return {
    ...serializePublicReview(document),
    moderationStatus: isReviewModerationStatus(cleanString(data.moderation_status))
      ? (cleanString(data.moderation_status) as ReviewModerationStatus)
      : "pending",
    publishConsent: data.publish_consent === true,
    quoteId: cleanString(data.quote_id) || null,
    customerEmail: cleanString(data.customer_email) || null,
    updatedAt: serializeDate(data.updated_at),
  };
}

export async function listPublishedReviews(firestore: FirestoreLike, limit = 12) {
  const snapshot = await firestore
    .collection("reviews")
    .where("moderation_status", "==", "published")
    .where("publish_consent", "==", true)
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map(serializePublicReview);
}

export async function listAdminReviews(firestore: FirestoreLike, limit = 50) {
  const snapshot = await firestore
    .collection("reviews")
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();
  return snapshot.docs.map(serializeAdminReview);
}

export async function createReviewToken(firestore: FirestoreLike, input: unknown, origin: string) {
  const validation = validateReviewTokenGenerationInput(input);
  if (!validation.ok) return { ok: false as const, status: 400, errors: validation.errors };

  const rawToken = generateReviewTokenSecret();
  const tokenHash = hashReviewToken(rawToken);
  const expiresAt = validation.value.expiresAt ? new Date(validation.value.expiresAt) : null;

  await firestore
    .collection("review_tokens")
    .doc(tokenHash)
    .set({
      token_hash: tokenHash,
      quote_id: validation.value.quoteId,
      customer_email: validation.value.customerEmail,
      status: "unused" satisfies ReviewTokenStatus,
      expires_at: expiresAt,
      created_at: FieldValue.serverTimestamp(),
      used_at: null,
    });

  return {
    ok: true as const,
    token: rawToken,
    tokenHash,
    link: `${origin.replace(/\/$/, "")}/opiniones/enviar?token=${encodeURIComponent(rawToken)}`,
  };
}

export async function submitReviewWithToken(firestore: FirestoreLike, input: unknown) {
  const validation = validateReviewSubmissionInput(input);
  if (!validation.ok) return { ok: false as const, status: 400, errors: validation.errors };

  const tokenHash = hashReviewToken(validation.value.token);
  const tokenReference = firestore.collection("review_tokens").doc(tokenHash);
  const reviewReference = firestore.collection("reviews").doc();

  const result = await firestore.runTransaction(async (transaction) => {
    const transactionLike = transaction as TransactionLike;
    const tokenSnapshot = await transactionLike.get(tokenReference);

    if (!tokenSnapshot.exists) {
      return {
        ok: false as const,
        status: 404,
        errors: { token: "El enlace de opinión no es válido." },
      };
    }

    const tokenData = tokenSnapshot.data?.() ?? {};
    if (cleanString(tokenData.status) !== "unused") {
      return { ok: false as const, status: 409, errors: { token: "Este enlace ya fue usado." } };
    }

    const expiresAt = serializeDate(tokenData.expires_at);
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      return {
        ok: false as const,
        status: 410,
        errors: { token: "Este enlace de opinión expiró." },
      };
    }

    transactionLike.set(reviewReference, {
      rating: validation.value.rating,
      comment: validation.value.comment,
      public_name: validation.value.publicName,
      publish_consent: validation.value.publishConsent,
      moderation_status: "pending" satisfies ReviewModerationStatus,
      review_token_hash: tokenHash,
      quote_id: cleanString(tokenData.quote_id) || null,
      customer_email: cleanString(tokenData.customer_email) || null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
    transactionLike.update(tokenReference, {
      status: "used" satisfies ReviewTokenStatus,
      used_at: FieldValue.serverTimestamp(),
    });

    return { ok: true as const, id: reviewReference.id };
  });

  return result;
}

export async function updateReviewModerationStatus(
  firestore: FirestoreLike,
  reviewId: unknown,
  moderationStatus: unknown,
) {
  const cleanReviewId = cleanString(reviewId);
  const cleanStatus = cleanString(moderationStatus);

  if (!cleanReviewId || !isValidSafeId(cleanReviewId)) {
    return { ok: false as const, status: 400, error: "ID de opinión inválido." };
  }
  if (!isReviewModerationStatus(cleanStatus)) {
    return { ok: false as const, status: 400, error: "Estado de moderación no permitido." };
  }

  const reference = firestore.collection("reviews").doc(cleanReviewId);
  const snapshot = await reference.get();
  if (!snapshot.exists) return { ok: false as const, status: 404, error: "La opinión no existe." };

  await reference.update({
    moderation_status: cleanStatus,
    updated_at: FieldValue.serverTimestamp(),
  });
  return { ok: true as const, reviewId: cleanReviewId, moderationStatus: cleanStatus };
}
