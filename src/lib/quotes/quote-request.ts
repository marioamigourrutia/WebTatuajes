import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "../firebase/admin";

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
  descriptionPreview: string;
  budgetClp: number | null;
};

type FirestoreLike = NonNullable<ReturnType<typeof getFirebaseAdminFirestore>>;

const maxLengths = {
  customerName: 80,
  email: 160,
  phone: 40,
  description: 1500,
  bodyPlacement: 120,
  approximateSize: 120,
};

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

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

export async function listRecentQuoteRequests(firestore: FirestoreLike, limit = 20) {
  const snapshot = await firestore
    .collection("quotes")
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();

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
      descriptionPreview: preview(data.description),
      budgetClp: typeof data.budget_clp === "number" ? data.budget_clp : null,
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
