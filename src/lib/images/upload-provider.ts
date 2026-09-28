import { createHash, randomBytes } from "node:crypto";
import sharp, { type Metadata } from "sharp";

export const imageUploadProviders = ["cloudinary", "imagekit", "disabled"] as const;
export type ImageUploadProvider = (typeof imageUploadProviders)[number];

export type UploadedImageMetadata = {
  provider: "cloudinary" | "imagekit";
  providerId: string;
  secureUrl: string | null;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};

export type ImageUploadPurpose = "portfolio" | "quote-reference" | "editorial";

export const defaultImageUploadMaxSizeBytes = 5 * 1024 * 1024;
export const allowedImageUploadMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

type AllowedImageUploadMimeType = (typeof allowedImageUploadMimeTypes)[number];

const invalidImageContentMessage = "Solo se permiten imágenes JPG, PNG o WEBP válidas.";
const unsupportedGifMessage =
  "No se permiten GIF por ahora porque el procesamiento seguro de imágenes animadas está fuera de alcance.";
const processedImageMimeType = "image/webp" as const;

const disabledMessage =
  "La carga de imágenes está deshabilitada. Puedes usar una URL pública o coordinar el envío por WhatsApp.";

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanFolderSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/^\/+|\/+$/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function parseProvider(value = process.env.IMAGE_UPLOAD_PROVIDER): ImageUploadProvider {
  if (value === "cloudinary" || value === "imagekit") return value;
  return "disabled";
}

function parseMaxSizeBytes(value = process.env.IMAGE_UPLOAD_MAX_SIZE_BYTES): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : defaultImageUploadMaxSizeBytes;
}

function formatMaxSize(maxSizeBytes: number) {
  const maxSizeMegabytes = maxSizeBytes / (1024 * 1024);

  return maxSizeMegabytes >= 1 && Number.isInteger(maxSizeMegabytes)
    ? `${maxSizeMegabytes} MB`
    : `${maxSizeBytes} bytes`;
}

function getProcessedImageTooLargeMessage(maxSizeBytes: number) {
  return `La imagen procesada debe pesar ${formatMaxSize(maxSizeBytes)} o menos. Prueba con una imagen más liviana o con menos detalle.`;
}

export function getImageUploadConfig() {
  const provider = parseProvider();
  const cloudName = cleanString(process.env.CLOUDINARY_CLOUD_NAME);
  const apiKey = cleanString(process.env.CLOUDINARY_API_KEY);
  const apiSecret = cleanString(process.env.CLOUDINARY_API_SECRET);
  const cloudinaryFolder = cleanFolderSegment(process.env.CLOUDINARY_UPLOAD_FOLDER ?? "webtatuajes");
  const imageKitPrivateKey = cleanString(process.env.IMAGEKIT_PRIVATE_KEY);
  const imageKitUrlEndpoint = cleanString(process.env.IMAGEKIT_URL_ENDPOINT);
  const imageKitFolder = cleanFolderSegment(process.env.IMAGEKIT_UPLOAD_FOLDER ?? "webtatuajes");
  const maxSizeBytes = parseMaxSizeBytes();
  const configured =
    (provider === "cloudinary" && Boolean(cloudName && apiKey && apiSecret)) ||
    (provider === "imagekit" && Boolean(imageKitPrivateKey && imageKitUrlEndpoint));

  return {
    provider,
    configured,
    cloudName,
    apiKey,
    apiSecret,
    cloudinaryFolder,
    imageKitPrivateKey,
    imageKitUrlEndpoint,
    imageKitFolder,
    maxSizeBytes,
  } as const;
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
    errors.image =
      file.type === "image/gif"
        ? unsupportedGifMessage
        : "Solo se permiten imágenes JPG, PNG o WEBP.";
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

function detectImageMimeType(bytes: Uint8Array): AllowedImageUploadMimeType | "image/gif" | null {
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

  if (detectedMimeType === "image/gif") {
    return { ok: false as const, errors: { image: unsupportedGifMessage } };
  }

  return { ok: true as const, mimeType: detectedMimeType };
}

type ProcessedUploadImage = {
  buffer: Buffer;
  mimeType: typeof processedImageMimeType;
  sizeBytes: number;
  width: number;
  height: number;
};

function getResizeBounds(width: number | undefined, height: number | undefined) {
  if (width && height && height > width) return { width: 1080, height: 1920 };
  if (width && height && width > height) return { width: 1920, height: 1080 };
  return { width: 1920, height: 1920 };
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

function getOrientedDimensions(metadata: Metadata) {
  if (metadata.orientation && metadata.orientation >= 5 && metadata.orientation <= 8) {
    return { width: metadata.height, height: metadata.width };
  }

  return { width: metadata.width, height: metadata.height };
}

async function processUploadImage(file: File): Promise<ProcessedUploadImage> {
  const input = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(input).metadata();
  const orientedDimensions = getOrientedDimensions(metadata);
  const bounds = getResizeBounds(orientedDimensions.width, orientedDimensions.height);
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ ...bounds, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    mimeType: processedImageMimeType,
    sizeBytes: info.size,
    width: info.width,
    height: info.height,
  };
}

function getPurposeFolder(purpose: ImageUploadPurpose) {
  if (purpose === "portfolio") return "portfolio";
  if (purpose === "editorial") return "editorial";
  return "quote-references";
}

function signCloudinaryParams(params: Record<string, string>, apiSecret: string) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

async function uploadToCloudinary(
  processedImage: ProcessedUploadImage,
  purpose: ImageUploadPurpose,
  config: ReturnType<typeof getImageUploadConfig>,
): Promise<UploadedImageMetadata | null> {
  const folder = `${config.cloudinaryFolder}/${getPurposeFolder(purpose)}`;
  const publicId = `${folder}/${randomBytes(16).toString("hex")}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signCloudinaryParams(
    { folder, public_id: publicId, timestamp },
    config.apiSecret,
  );
  const formData = new FormData();
  formData.set(
    "file",
    new Blob([bufferToArrayBuffer(processedImage.buffer)], { type: processedImage.mimeType }),
  );
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
    return null;
  }

  return {
    provider: "cloudinary",
    providerId: body.public_id,
    secureUrl: body.secure_url,
    mimeType: processedImage.mimeType,
    sizeBytes: processedImage.sizeBytes,
    width: processedImage.width,
    height: processedImage.height,
  };
}

async function uploadToImageKit(
  processedImage: ProcessedUploadImage,
  purpose: ImageUploadPurpose,
  config: ReturnType<typeof getImageUploadConfig>,
): Promise<UploadedImageMetadata | null> {
  const folder = `/${[config.imageKitFolder, getPurposeFolder(purpose)].filter(Boolean).join("/")}`;
  const fileName = `${randomBytes(16).toString("hex")}.webp`;
  const formData = new FormData();
  formData.set(
    "file",
    new Blob([bufferToArrayBuffer(processedImage.buffer)], { type: processedImage.mimeType }),
  );
  formData.set("fileName", fileName);
  formData.set("folder", folder);
  formData.set("useUniqueFileName", "true");
  formData.set("tags", `webtatuajes,${purpose}`);

  const authorization = Buffer.from(`${config.imageKitPrivateKey}:`).toString("base64");
  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${authorization}` },
    body: formData,
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok || typeof body.url !== "string" || typeof body.fileId !== "string") {
    return null;
  }

  return {
    provider: "imagekit",
    providerId: body.fileId,
    secureUrl: body.url,
    mimeType: processedImage.mimeType,
    sizeBytes:
      typeof body.size === "number" && Number.isFinite(body.size)
        ? body.size
        : processedImage.sizeBytes,
    width:
      typeof body.width === "number" && Number.isFinite(body.width)
        ? body.width
        : processedImage.width,
    height:
      typeof body.height === "number" && Number.isFinite(body.height)
        ? body.height
        : processedImage.height,
  };
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

  let processedImage: ProcessedUploadImage;
  try {
    processedImage = await processUploadImage(file);
  } catch {
    return { ok: false, status: 400, errors: { image: invalidImageContentMessage } };
  }

  if (processedImage.sizeBytes > config.maxSizeBytes) {
    return {
      ok: false,
      status: 400,
      errors: { image: getProcessedImageTooLargeMessage(config.maxSizeBytes) },
    };
  }

  const image =
    config.provider === "imagekit"
      ? await uploadToImageKit(processedImage, purpose, config)
      : await uploadToCloudinary(processedImage, purpose, config);

  if (!image) {
    return {
      ok: false,
      status: 502,
      errors: { image: "No se pudo subir la imagen al proveedor externo." },
    };
  }

  return { ok: true, image };
}
