import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { randomBytes } from "node:crypto";
import { appConfig } from "@/lib/config/app";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { isPurchaseRequestStatus, type PurchaseRequestStatus } from "./purchase-request-status";
import { buildPurchaseWhatsAppUrl } from "./contact-links";
import { getPurchasableProductById, type ShopProduct } from "./catalog";
export {
  isPurchaseRequestStatus,
  purchaseRequestStatusLabels,
  purchaseRequestStatuses,
  type PurchaseRequestStatus,
} from "./purchase-request-status";

export type PurchaseRequestInput = {
  productId: string;
  customerName: string;
  phone: string;
  email?: string;
  contactConsent: true;
};

export type RecentPurchaseRequest = {
  id: string;
  purchaseCode: string;
  createdAt: string | null;
  customerName: string;
  phone: string;
  email: string | null;
  productCode: string;
  productTitle: string;
  priceClp: number;
  status: string;
  whatsappUrl: string | null;
};

type FirestoreLike = NonNullable<ReturnType<typeof getFirebaseAdminFirestore>>;

const maxLengths = {
  productId: 120,
  customerName: 80,
  phone: 40,
  email: 160,
};

const phoneAllowedCharactersPattern = /^[\d\s+()-]+$/;
const phoneDigitRange = { min: 8, max: 15 };

const purchaseRequestStatusTransitions: Record<
  PurchaseRequestStatus,
  readonly PurchaseRequestStatus[]
> = {
  pending: ["contacted", "discarded"],
  contacted: ["reserved", "discarded"],
  reserved: ["sold", "contacted", "discarded"],
  sold: [],
  discarded: [],
};

const safeLegacyInitialPurchaseRequestStatuses: readonly PurchaseRequestStatus[] = [
  "pending",
  "contacted",
  "discarded",
];

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function isChecked(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPurchasePhone(value: string): boolean {
  const digitCount = value.replace(/\D/g, "").length;

  return (
    phoneAllowedCharactersPattern.test(value) &&
    digitCount >= phoneDigitRange.min &&
    digitCount <= phoneDigitRange.max
  );
}

function canUpdatePurchaseRequestStatus(
  currentStatus: unknown,
  targetStatus: PurchaseRequestStatus,
): boolean {
  if (!isPurchaseRequestStatus(currentStatus)) {
    // Legacy records may have a missing/unknown status. Only allow safe non-sale bootstrap states.
    return safeLegacyInitialPurchaseRequestStatuses.includes(targetStatus);
  }

  return purchaseRequestStatusTransitions[currentStatus].includes(targetStatus);
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

export function validatePurchaseRequestInput(
  input: unknown,
):
  | { ok: true; value: PurchaseRequestInput; product: ShopProduct }
  | { ok: false; errors: Record<string, string> } {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const productId = cleanString(data.productId);
  const customerName = cleanString(data.customerName);
  const phone = cleanString(data.phone);
  const email = cleanString(data.email).toLowerCase();
  const contactConsent = isChecked(data.contactConsent);
  const errors: Record<string, string> = {};

  if (!productId) errors.productId = "Selecciona una obra disponible.";
  if (productId.length > maxLengths.productId)
    errors.productId = "La obra seleccionada no es válida.";

  const product = productId ? getPurchasableProductById(productId) : null;
  if (productId && !product) errors.productId = "La obra no está disponible para solicitar.";

  if (!customerName) errors.customerName = "Ingresa tu nombre.";
  if (customerName.length > maxLengths.customerName) {
    errors.customerName = "El nombre es demasiado largo.";
  }

  if (!phone) errors.phone = "Ingresa un teléfono de contacto.";
  else if (phone.length > maxLengths.phone) errors.phone = "El teléfono es demasiado largo.";
  else if (!isValidPurchasePhone(phone)) errors.phone = "Ingresa un teléfono válido.";

  if (email && !isValidEmail(email)) errors.email = "Ingresa un email válido.";
  if (email.length > maxLengths.email) errors.email = "El email es demasiado largo.";

  if (!contactConsent) {
    errors.contactConsent = "Debes aceptar que el estudio te contacte por esta solicitud.";
  }

  if (Object.keys(errors).length > 0 || !product) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: { productId, customerName, phone, email: email || undefined, contactConsent: true },
    product,
  };
}

function generatePurchaseCodeCandidate(now = new Date()) {
  const year = now.getFullYear();
  const token = randomBytes(4).toString("hex").slice(0, 5).toUpperCase();

  return `COM-${year}-${token}`;
}

async function generateUniquePurchaseCode(firestore: FirestoreLike) {
  const purchaseRequests = firestore.collection("purchase_requests");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generatePurchaseCodeCandidate();
    const existing = await purchaseRequests.where("purchase_code", "==", candidate).limit(1).get();

    if (existing.empty || existing.docs?.length === 0) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique purchase request code.");
}

export function mapPurchaseRequestToFirestore(
  input: PurchaseRequestInput,
  product: ShopProduct,
  purchaseCode: string,
) {
  return {
    purchase_code: purchaseCode,
    customer_name: input.customerName,
    customer_phone: input.phone,
    customer_email: input.email ?? null,
    product_id: product.id,
    product_code: product.code,
    product_title: product.title,
    product_price_clp: product.priceClp,
    status: "pending",
    contact_consent: input.contactConsent,
    consent_recorded_at: FieldValue.serverTimestamp(),
    source: "public_shop_form",
  };
}

export async function createPurchaseRequest(
  input: unknown,
  firestore = getFirebaseAdminFirestore(),
) {
  const validation = validatePurchaseRequestInput(input);

  if (!validation.ok) {
    return { ok: false as const, status: 400, errors: validation.errors };
  }

  if (!firestore) {
    return {
      ok: false as const,
      status: 503,
      errors: { form: "Firebase Admin no está configurado para guardar solicitudes." },
    };
  }

  const purchaseCode = await generateUniquePurchaseCode(firestore);
  const document = {
    ...mapPurchaseRequestToFirestore(validation.value, validation.product, purchaseCode),
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  };
  const result = await firestore.collection("purchase_requests").add(document);
  const whatsappUrl = buildPurchaseWhatsAppUrl({
    studioPhone: appConfig.whatsappPhone,
    requestCode: purchaseCode,
    customerName: validation.value.customerName,
    customerPhone: validation.value.phone,
    customerEmail: validation.value.email ?? null,
    product: validation.product,
  });

  return { ok: true as const, id: result.id, purchaseCode, whatsappUrl };
}

export async function listRecentPurchaseRequests(firestore: FirestoreLike, limit = 10) {
  const snapshot = await firestore
    .collection("purchase_requests")
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((document): RecentPurchaseRequest => {
    const data = document.data();
    const purchaseCode = cleanString(data.purchase_code) || document.id;
    const customerName = cleanString(data.customer_name) || "Sin nombre";
    const phone = cleanString(data.customer_phone);
    const email = cleanString(data.customer_email) || null;
    const productCode = cleanString(data.product_code);
    const productTitle = cleanString(data.product_title) || "Obra sin título";
    const priceClp = typeof data.product_price_clp === "number" ? data.product_price_clp : 0;

    return {
      id: document.id,
      purchaseCode,
      createdAt: serializeCreatedAt(data.created_at),
      customerName,
      phone,
      email,
      productCode,
      productTitle,
      priceClp,
      status: (() => {
        const status = cleanString(data.status);
        return isPurchaseRequestStatus(status) ? status : "pending";
      })(),
      whatsappUrl: buildPurchaseWhatsAppUrl({
        studioPhone: appConfig.whatsappPhone,
        requestCode: purchaseCode,
        customerName,
        customerPhone: phone,
        customerEmail: email,
        product: { code: productCode, title: productTitle, priceClp },
      }),
    };
  });
}

export async function updatePurchaseRequestStatus(
  firestore: FirestoreLike,
  purchaseRequestId: unknown,
  status: unknown,
) {
  const cleanPurchaseRequestId = cleanString(purchaseRequestId);

  if (!/^[A-Za-z0-9_-]{6,160}$/.test(cleanPurchaseRequestId)) {
    return { ok: false as const, status: 400, error: "ID de solicitud de compra inválido." };
  }

  if (!isPurchaseRequestStatus(status)) {
    return { ok: false as const, status: 400, error: "Estado de compra inválido." };
  }

  const reference = firestore.collection("purchase_requests").doc(cleanPurchaseRequestId);
  const snapshot = await reference.get?.();

  if (!snapshot?.exists) {
    return { ok: false as const, status: 404, error: "La solicitud de compra no existe." };
  }

  const currentStatus = snapshot.data?.()?.status;

  if (!canUpdatePurchaseRequestStatus(currentStatus, status)) {
    return {
      ok: false as const,
      status: 400,
      error: "Transición de estado de compra inválida.",
    };
  }

  await reference.update?.({ status, updated_at: FieldValue.serverTimestamp() });

  return { ok: true as const, purchaseRequestId: cleanPurchaseRequestId, status };
}
