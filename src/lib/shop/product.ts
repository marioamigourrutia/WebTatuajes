import { FieldValue } from "firebase-admin/firestore";
import { isFirebaseAdminBackendConfigured } from "@/lib/config/firebase-admin";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  sanitizeExternalImageUrl,
  validateOptionalExternalImageUrl,
} from "@/lib/images/external-image-url";
import { productStatuses, type ProductStatus, type ShopProduct } from "./catalog";

type FirestoreLike = NonNullable<ReturnType<typeof getFirebaseAdminFirestore>>;

export type ProductInput = {
  code: string;
  title: string;
  description: string;
  priceClp: number;
  status: ProductStatus;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
};

export type AdminProduct = ProductInput & {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
};

const maxLengths = {
  id: 120,
  code: 40,
  title: 120,
  description: 500,
};

export function cleanProductString(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cleanLongText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\r\n/g, "\n") : "";
}

export function isValidProductId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{6,120}$/.test(value.trim());
}

function isProductStatus(value: unknown): value is ProductStatus {
  return typeof value === "string" && productStatuses.includes(value as ProductStatus);
}

function parsePriceClp(value: unknown) {
  const parsed = typeof value === "string" ? Number(value) : value;

  return typeof parsed === "number" && Number.isInteger(parsed) ? parsed : NaN;
}

function parseSortOrder(value: unknown) {
  const parsed = typeof value === "string" ? Number(value) : value;

  return typeof parsed === "number" && Number.isInteger(parsed) ? parsed : 0;
}

function serializeDate(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (value instanceof Date) return value.toISOString();

  return null;
}

export function validateProductInput(input: unknown) {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const code = cleanProductString(data.code).toUpperCase();
  const title = cleanProductString(data.title);
  const description = cleanLongText(data.description);
  const priceClp = parsePriceClp(data.priceClp ?? data.price_clp);
  const status = isProductStatus(data.status) ? data.status : "available";
  const imageUrlValidation = validateOptionalExternalImageUrl(data.imageUrl ?? data.image_url);
  const sortOrder = parseSortOrder(data.sortOrder ?? data.sort_order);
  const active = data.active === true || data.active === "true" || data.active === "on";
  const errors: Record<string, string> = {};

  if (!code) errors.code = "Ingresa el código de la obra.";
  if (code.length > maxLengths.code) errors.code = "El código es demasiado largo.";
  if (!/^[A-Z0-9-]+$/.test(code)) errors.code = "Usa solo letras, números y guiones.";
  if (!title) errors.title = "Ingresa el título de la obra.";
  if (title.length > maxLengths.title) errors.title = "El título es demasiado largo.";
  if (!description) errors.description = "Ingresa una descripción breve.";
  if (description.length > maxLengths.description) {
    errors.description = "La descripción es demasiado larga.";
  }
  if (!Number.isInteger(priceClp) || priceClp < 0 || priceClp > 99_999_999) {
    errors.priceClp = "Ingresa un precio CLP válido.";
  }
  if (!imageUrlValidation.ok) errors.imageUrl = imageUrlValidation.error;
  if (sortOrder < 0 || sortOrder > 9999) errors.sortOrder = "Usa un orden entre 0 y 9999.";

  if (Object.keys(errors).length > 0) return { ok: false as const, errors };

  return {
    ok: true as const,
    value: {
      code,
      title,
      description,
      priceClp,
      status,
      imageUrl: imageUrlValidation.ok ? imageUrlValidation.value : null,
      active,
      sortOrder,
    } satisfies ProductInput,
  };
}

export function mapProductToFirestore(input: ProductInput) {
  return {
    code: input.code,
    title: input.title,
    description: input.description,
    price_clp: input.priceClp,
    status: input.status,
    image_url: input.imageUrl,
    active: input.active,
    sort_order: input.sortOrder,
  };
}

export function mapFirestoreProduct(document: {
  id: string;
  data: () => Record<string, unknown>;
}): AdminProduct {
  const data = document.data();
  const status = isProductStatus(data.status)
    ? data.status
    : data.active === false
      ? "hidden"
      : "available";
  const priceClp = parsePriceClp(data.price_clp);
  const sortOrder = parseSortOrder(data.sort_order);

  return {
    id: document.id,
    code: cleanProductString(data.code) || document.id,
    title: cleanProductString(data.title) || "Obra sin título",
    description: cleanLongText(data.description) || "Obra disponible del estudio.",
    priceClp: Number.isInteger(priceClp) ? priceClp : 0,
    status,
    imageUrl: sanitizeExternalImageUrl(data.image_url),
    active: data.active !== false,
    sortOrder,
    createdAt: serializeDate(data.created_at),
    updatedAt: serializeDate(data.updated_at),
  };
}

export function toShopProduct(product: AdminProduct): ShopProduct {
  return {
    id: product.id,
    code: product.code,
    title: product.title,
    description: product.description,
    priceClp: product.priceClp,
    status: product.status,
    imageUrl: product.imageUrl ?? undefined,
  };
}

function sortProducts(first: AdminProduct, second: AdminProduct) {
  return first.sortOrder - second.sortOrder || first.code.localeCompare(second.code, "es-CL");
}

export async function listAdminProducts(firestore: FirestoreLike, limit = 100) {
  const snapshot = await firestore.collection("products").get();

  return snapshot.docs
    .map((document) => mapFirestoreProduct(document))
    .sort(sortProducts)
    .slice(0, limit);
}

export async function listPublicFirestoreProducts(
  firestore?: FirestoreLike | null,
  limit = 50,
): Promise<ShopProduct[]> {
  const result = await listPublicFirestoreProductsResult(firestore, limit);

  return result.ok ? result.products : [];
}

export async function listPublicFirestoreProductsResult(
  firestore?: FirestoreLike | null,
  limit = 50,
): Promise<{ ok: true; products: ShopProduct[] } | { ok: false }> {
  try {
    if (firestore === undefined && !isFirebaseAdminBackendConfigured()) return { ok: false };

    const productFirestore = firestore ?? getFirebaseAdminFirestore();
    if (!productFirestore) return { ok: false };

    const snapshot = await productFirestore
      .collection("products")
      .where("active", "==", true)
      .get();

    const products = snapshot.docs
      .map((document) => mapFirestoreProduct(document))
      .filter((product) => product.status !== "hidden")
      .sort(sortProducts)
      .slice(0, limit)
      .map(toShopProduct);

    return { ok: true, products };
  } catch {
    return { ok: false };
  }
}

export async function getPurchasableFirestoreProductById(
  productId: unknown,
  firestore: FirestoreLike,
) {
  const cleanProductId = cleanProductString(productId);

  if (!cleanProductId || cleanProductId.length > maxLengths.id) return null;

  const snapshot = await firestore.collection("products").doc(cleanProductId).get();
  if (!snapshot.exists) return null;

  const product = mapFirestoreProduct({
    id: snapshot.id ?? cleanProductId,
    data: () => snapshot.data() ?? {},
  });

  return product.active && product.status === "available" ? toShopProduct(product) : null;
}

export async function createProduct(input: unknown, firestore = getFirebaseAdminFirestore()) {
  const validation = validateProductInput(input);
  if (!validation.ok) return { ok: false as const, status: 400, errors: validation.errors };
  if (!firestore)
    return {
      ok: false as const,
      status: 503,
      errors: { form: "Firebase Admin no está configurado." },
    };

  const reference = firestore.collection("products").doc();
  await reference.set({
    ...mapProductToFirestore(validation.value),
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  return { ok: true as const, id: reference.id };
}

export async function updateProduct(firestore: FirestoreLike, productId: unknown, input: unknown) {
  const cleanProductId = cleanProductString(productId);
  if (!isValidProductId(cleanProductId))
    return { ok: false as const, status: 400, errors: { productId: "ID de obra inválido." } };

  const validation = validateProductInput(input);
  if (!validation.ok) return { ok: false as const, status: 400, errors: validation.errors };

  const reference = firestore.collection("products").doc(cleanProductId);
  const snapshot = await reference.get();
  if (!snapshot.exists)
    return { ok: false as const, status: 404, errors: { productId: "La obra no existe." } };

  await reference.update({
    ...mapProductToFirestore(validation.value),
    updated_at: FieldValue.serverTimestamp(),
  });

  return { ok: true as const, id: cleanProductId };
}

export async function hideProduct(firestore: FirestoreLike, productId: unknown) {
  const cleanProductId = cleanProductString(productId);
  if (!isValidProductId(cleanProductId))
    return { ok: false as const, status: 400, error: "ID de obra inválido." };

  const reference = firestore.collection("products").doc(cleanProductId);
  const snapshot = await reference.get();
  if (!snapshot.exists) return { ok: false as const, status: 404, error: "La obra no existe." };

  await reference.update({
    active: false,
    status: "hidden",
    updated_at: FieldValue.serverTimestamp(),
  });

  return { ok: true as const, id: cleanProductId };
}
