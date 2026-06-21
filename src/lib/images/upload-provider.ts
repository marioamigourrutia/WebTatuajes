import { createHash, randomBytes } from "node:crypto";

export const imageUploadProviders = ["cloudinary", "disabled"] as const;
export type ImageUploadProvider = (typeof imageUploadProviders)[number];

export type UploadedImageMetadata = {
  provider: "cloudinary";
  providerId: string;
  secureUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};

export type ImageUploadPurpose = "portfolio" | "quote-reference";

export const defaultImageUploadMaxSizeBytes = 5 * 1024 * 1024;
export const allowedImageUploadMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type AllowedImageUploadMimeType = (typeof allowedImageUploadMimeTypes)[number];

const invalidImageContentMessage = "Solo se permiten imágenes JPG, PNG, WEBP o GIF válidas.";

const disabledMessage =
  "La carga de imágenes requiere configurar un proveedor externo de imágenes. Puedes usar una URL pública mientras se configura Cloudinary.";

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanFolderSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function parseProvider(value = process.env.IMAGE_UPLOAD_PROVIDER): ImageUploadProvider {
  return value === "cloudinary" ? "cloudinary" : "disabled";
}

function parseMaxSizeBytes(value = process.env.IMAGE_UPLOAD_MAX_SIZE_BYTES): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : defaultImageUploadMaxSizeBytes;
}

export function getImageUploadConfig() {
  const provider = parseProvider();
  const cloudName = cleanString(process.env.CLOUDINARY_CLOUD_NAME);
  const apiKey = cleanString(process.env.CLOUDINARY_API_KEY);
  const apiSecret = cleanString(process.env.CLOUDINARY_API_SECRET);
  const folder = cleanFolderSegment(process.env.CLOUDINARY_UPLOAD_FOLDER ?? "webtatuajes");
  const maxSizeBytes = parseMaxSizeBytes();
  const configured = provider === "cloudinary" && Boolean(cloudName && apiKey && apiSecret);

  return { provider, configured, cloudName, apiKey, apiSecret, folder, maxSizeBytes } as const;
}

export function isExternalImageUploadConfigured() {
  return getImageUploadConfig().configured;
}

export function validateUploadImage(
  file: File,
  maxSizeBytes = getImageUploadConfig().maxSizeBytes,
) {
  const errors: Record<string, string> = {};

  if (typeof file.arrayBuffer !== "function") {
    errors.image = "El archivo no es válido.";
  }

  if (
    !allowedImageUploadMimeTypes.includes(file.type as (typeof allowedImageUploadMimeTypes)[number])
  ) {
    errors.image = "Solo se permiten imágenes JPG, PNG, WEBP o GIF.";
  }

  if (file.size <= 0) {
    errors.image = "La imagen está vacía.";
  }

  if (file.size > maxSizeBytes) {
    errors.image = `La imagen debe pesar ${Math.floor(maxSizeBytes / (1024 * 1024))} MB o menos.`;
  }

  return Object.keys(errors).length > 0 ? { ok: false as const, errors } : { ok: true as const };
}

function bytesStartWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function detectImageMimeType(bytes: Uint8Array): AllowedImageUploadMimeType | null {
  if (bytes.length < 4) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";

  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  const header = new TextDecoder("ascii", { fatal: false }).decode(bytes.slice(0, 12));

  if (header.startsWith("GIF87a") || header.startsWith("GIF89a")) return "image/gif";
  if (header.startsWith("RIFF") && header.slice(8, 12) === "WEBP") return "image/webp";

  return null;
}

export async function validateUploadImageContent(file: File) {
  if (typeof file.arrayBuffer !== "function") {
    return { ok: false as const, errors: { image: "El archivo no es válido." } };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedMimeType = detectImageMimeType(bytes);

  if (!detectedMimeType) {
    return { ok: false as const, errors: { image: invalidImageContentMessage } };
  }

  return { ok: true as const, mimeType: detectedMimeType };
}

function getPurposeFolder(purpose: ImageUploadPurpose) {
  return purpose === "portfolio" ? "portfolio" : "quote-references";
}

function signCloudinaryParams(params: Record<string, string>, apiSecret: string) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

export async function uploadImageToExternalProvider(
  file: File,
  purpose: ImageUploadPurpose,
  config = getImageUploadConfig(),
): Promise<
  | { ok: true; image: UploadedImageMetadata }
  | { ok: false; status: number; errors: Record<string, string> }
> {
  const validation = validateUploadImage(file, config.maxSizeBytes);
  if (!validation.ok) return { ok: false, status: 400, errors: validation.errors };

  const contentValidation = await validateUploadImageContent(file);
  if (!contentValidation.ok) return { ok: false, status: 400, errors: contentValidation.errors };

  if (!config.configured) {
    return { ok: false, status: 503, errors: { image: disabledMessage } };
  }

  const folder = `${config.folder}/${getPurposeFolder(purpose)}`;
  const publicId = `${folder}/${randomBytes(16).toString("hex")}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signCloudinaryParams(
    { folder, public_id: publicId, timestamp },
    config.apiSecret,
  );
  const formData = new FormData();
  formData.set("file", new Blob([await file.arrayBuffer()], { type: contentValidation.mimeType }));
  formData.set("api_key", config.apiKey);
  formData.set("timestamp", timestamp);
  formData.set("folder", folder);
  formData.set("public_id", publicId);
  formData.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`,
    { method: "POST", body: formData },
  );
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok || typeof body.secure_url !== "string" || typeof body.public_id !== "string") {
    return {
      ok: false,
      status: 502,
      errors: { image: "No se pudo subir la imagen al proveedor externo." },
    };
  }

  return {
    ok: true,
    image: {
      provider: "cloudinary",
      providerId: body.public_id,
      secureUrl: body.secure_url,
      mimeType: contentValidation.mimeType,
      sizeBytes: file.size,
      width: typeof body.width === "number" ? body.width : null,
      height: typeof body.height === "number" ? body.height : null,
    },
  };
}
