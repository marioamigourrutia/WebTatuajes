import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  defaultImageUploadMaxSizeBytes,
  getImageUploadConfig,
  isExternalImageUploadConfigured,
  uploadImageToExternalProvider,
  validateUploadImage,
  validateUploadImageContent,
} from "./upload-provider";

const originalEnv = { ...process.env };
const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00]);

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

async function createImageFile({
  width = 16,
  height = 12,
  type = "image/png",
  name = "image.png",
}: {
  width?: number;
  height?: number;
  type?: "image/jpeg" | "image/png" | "image/webp";
  name?: string;
} = {}) {
  const image = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 120, b: 80 } },
  });
  const buffer =
    type === "image/jpeg"
      ? await image.jpeg().toBuffer()
      : type === "image/webp"
        ? await image.webp().toBuffer()
        : await image.png().toBuffer();

  return new File([bufferToArrayBuffer(buffer)], name, { type });
}

async function createLowQualityWebpFile({
  width = 128,
  height = 128,
  name = "low-quality.webp",
}: {
  width?: number;
  height?: number;
  name?: string;
} = {}) {
  const pixels = Buffer.alloc(width * height * 3);
  for (let index = 0; index < pixels.length; index += 1) pixels[index] = index % 251;
  const buffer = await sharp(pixels, { raw: { width, height, channels: 3 } })
    .webp({ quality: 1 })
    .toBuffer();

  return new File([bufferToArrayBuffer(buffer)], name, { type: "image/webp" });
}

function resetEnv() {
  process.env = { ...originalEnv };
  delete process.env.IMAGE_UPLOAD_PROVIDER;
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  delete process.env.CLOUDINARY_UPLOAD_FOLDER;
  delete process.env.IMAGEKIT_PRIVATE_KEY;
  delete process.env.IMAGEKIT_URL_ENDPOINT;
  delete process.env.IMAGEKIT_UPLOAD_FOLDER;
  delete process.env.IMAGE_UPLOAD_MAX_SIZE_BYTES;
}

describe("upload provider config", () => {
  afterEach(() => {
    resetEnv();
    vi.restoreAllMocks();
  });

  it("defaults to disabled without credentials", () => {
    resetEnv();

    expect(getImageUploadConfig()).toMatchObject({
      provider: "disabled",
      configured: false,
      maxSizeBytes: defaultImageUploadMaxSizeBytes,
    });
    expect(isExternalImageUploadConfigured()).toBe(false);
  });

  it("ignores unsupported provider configuration", () => {
    resetEnv();
    process.env.IMAGE_UPLOAD_PROVIDER = "supabase";

    expect(getImageUploadConfig()).toMatchObject({ provider: "disabled", configured: false });
    expect(isExternalImageUploadConfigured()).toBe(false);
  });

  it("detects Cloudinary only when all server credentials are present", () => {
    resetEnv();
    process.env.IMAGE_UPLOAD_PROVIDER = "cloudinary";
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "key";
    process.env.CLOUDINARY_API_SECRET = "secret";
    process.env.CLOUDINARY_UPLOAD_FOLDER = "Tattoo Studio/Private";

    expect(getImageUploadConfig()).toMatchObject({
      provider: "cloudinary",
      configured: true,
      cloudinaryFolder: "tattoo-studio/private",
    });
  });

  it("detects ImageKit only with server private key and URL endpoint", () => {
    resetEnv();
    process.env.IMAGE_UPLOAD_PROVIDER = "imagekit";
    process.env.IMAGEKIT_PRIVATE_KEY = "private_test_key";
    process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/example";
    process.env.IMAGEKIT_UPLOAD_FOLDER = "Mario Gallery/WebTatuajes";

    expect(getImageUploadConfig()).toMatchObject({
      provider: "imagekit",
      configured: true,
      imageKitUrlEndpoint: "https://ik.imagekit.io/example",
      imageKitFolder: "mario-gallery/webtatuajes",
    });
    expect(isExternalImageUploadConfigured()).toBe(true);
  });

  it("rejects SVG and oversized files", () => {
    expect(validateUploadImage(new File(["<svg />"], "bad.svg", { type: "image/svg+xml" })).ok).toBe(false);
    expect(validateUploadImage(new File(["x".repeat(20)], "large.png", { type: "image/png" }), 10)).toEqual({
      ok: false,
      errors: { image: "La imagen debe pesar 0 MB o menos." },
    });
  });

  it("rejects files whose declared MIME is image/png but bytes are SVG or text", async () => {
    await expect(validateUploadImageContent(new File(["<svg />"], "fake.png", { type: "image/png" }))).resolves.toEqual({
      ok: false,
      errors: { image: "Solo se permiten imágenes JPG, PNG o WEBP válidas." },
    });
    await expect(validateUploadImageContent(new File(["not an image"], "fake.png", { type: "image/png" }))).resolves.toMatchObject({ ok: false });
  });

  it("rejects GIF uploads with a clear Spanish error", async () => {
    const error = "No se permiten GIF por ahora porque el procesamiento seguro de imágenes animadas está fuera de alcance.";
    expect(validateUploadImage(new File([gifBytes], "animated.gif", { type: "image/gif" }))).toEqual({
      ok: false,
      errors: { image: error },
    });
    await expect(validateUploadImageContent(new File([gifBytes], "animated.png", { type: "image/png" }))).resolves.toEqual({
      ok: false,
      errors: { image: error },
    });
  });

  it("returns a clear Spanish disabled error without crashing", async () => {
    resetEnv();

    await expect(uploadImageToExternalProvider(await createImageFile(), "portfolio")).resolves.toMatchObject({
      ok: false,
      status: 503,
      errors: { image: expect.stringContaining("deshabilitada") },
    });
  });

  it("rejects images when the processed WebP exceeds the configured max size", async () => {
    resetEnv();
    process.env.IMAGE_UPLOAD_PROVIDER = "cloudinary";
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "key";
    process.env.CLOUDINARY_API_SECRET = "secret";
    process.env.IMAGE_UPLOAD_MAX_SIZE_BYTES = "3000";

    await expect(uploadImageToExternalProvider(await createLowQualityWebpFile(), "portfolio")).resolves.toEqual({
      ok: false,
      status: 400,
      errors: {
        image:
          "La imagen procesada debe pesar 3000 bytes o menos. Prueba con una imagen más liviana o con menos detalle.",
      },
    });
  });

  it("uses a random Cloudinary public id without the original filename", async () => {
    resetEnv();
    process.env.IMAGE_UPLOAD_PROVIDER = "cloudinary";
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "key";
    process.env.CLOUDINARY_API_SECRET = "secret";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        public_id: "webtatuajes/portfolio/random-id",
        secure_url: "https://res.cloudinary.com/demo/image/upload/random-id.webp",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadImageToExternalProvider(
      await createImageFile({ width: 1024, height: 768, name: "client-original-name.png" }),
      "portfolio",
    );

    expect(result).toMatchObject({
      ok: true,
      image: { provider: "cloudinary", providerId: "webtatuajes/portfolio/random-id", mimeType: "image/webp" },
    });
    const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect(body.get("public_id")).not.toContain("client-original-name");
    expect(body.get("file")).toBeInstanceOf(Blob);
    expect((body.get("file") as Blob).type).toBe("image/webp");
  });

  it("uploads processed images to ImageKit using server-side basic auth", async () => {
    resetEnv();
    process.env.IMAGE_UPLOAD_PROVIDER = "imagekit";
    process.env.IMAGEKIT_PRIVATE_KEY = "private_test_key";
    process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/example";
    process.env.IMAGEKIT_UPLOAD_FOLDER = "webtatuajes";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        fileId: "file_123",
        url: "https://ik.imagekit.io/example/webtatuajes/editorial/random.webp",
        size: 2200,
        width: 1080,
        height: 1440,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadImageToExternalProvider(
      await createImageFile({ width: 800, height: 1200, name: "portrait-client-name.png" }),
      "editorial",
    );

    expect(result).toMatchObject({
      ok: true,
      image: {
        provider: "imagekit",
        providerId: "file_123",
        secureUrl: "https://ik.imagekit.io/example/webtatuajes/editorial/random.webp",
        mimeType: "image/webp",
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://upload.imagekit.io/api/v1/files/upload");
    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((options.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
    expect((options.headers as Record<string, string>).Authorization).not.toContain("private_test_key");
    const body = options.body as FormData;
    expect(body.get("folder")).toBe("/webtatuajes/editorial");
    expect(String(body.get("fileName"))).toMatch(/^[a-f0-9]{32}\.webp$/);
    expect(String(body.get("fileName"))).not.toContain("portrait-client-name");
    expect(body.get("file")).toBeInstanceOf(Blob);
    expect((body.get("file") as Blob).type).toBe("image/webp");
  });

  it("rejects disguised image/png content before calling the external provider", async () => {
    resetEnv();
    process.env.IMAGE_UPLOAD_PROVIDER = "cloudinary";
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "key";
    process.env.CLOUDINARY_API_SECRET = "secret";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadImageToExternalProvider(
      new File(["<svg><script /></svg>"], "client-original-name.png", { type: "image/png" }),
      "portfolio",
    );

    expect(result).toEqual({
      ok: false,
      status: 400,
      errors: { image: "Solo se permiten imágenes JPG, PNG o WEBP válidas." },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
