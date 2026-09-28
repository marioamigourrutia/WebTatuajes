export const imageUploadProviders = ["cloudinary", "imagekit", "disabled"] as const;
export type ImageUploadProvider = (typeof imageUploadProviders)[number];

export const defaultImageUploadMaxSizeBytes = 5 * 1024 * 1024;

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
