import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  defaultImageUploadMaxSizeBytes,
  createSupabaseStorageSignedUrl,
  getImageUploadConfig,
  isExternalImageUploadConfigured,
  uploadImageToExternalProvider,
  validateUploadImage,
  validateUploadImageContent,
} from "./upload-provider";

const supabaseMocks = vi.hoisted(() => {
  const upload = vi.fn();
  const getPublicUrl = vi.fn();
  const createSignedUrl = vi.fn();
  const from = vi.fn(() => ({ upload, getPublicUrl, createSignedUrl }));
  const createClient = vi.fn(() => ({ storage: { from } }));

  return { createClient, createSignedUrl, from, getPublicUrl, upload };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: supabaseMocks.createClient,
}));

const originalEnv = { ...process.env };
const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00]);

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
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
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 120, b: 80 },
    },
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
  for (let index = 0; index < pixels.length; index += 1) {
    pixels[index] = index % 251;
  }
  const buffer = await sharp(pixels, { raw: { width, height, channels: 3 } })
    .webp({ quality: 1 })
    .toBuffer();

  return new File([bufferToArrayBuffer(buffer)], name, { type: "image/webp" });
}

async function createExifOrientedJpegFile() {
  const buffer = await sharp({
    create: {
      width: 12,
      height: 20,
      channels: 3,
      background: { r: 40, g: 90, b: 180 },
    },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();

  return new File([bufferToArrayBuffer(buffer)], "oriented.jpg", { type: "image/jpeg" });
}

function resetEnv() {
  process.env = { ...originalEnv };
  delete process.env.IMAGE_UPLOAD_PROVIDER;
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  delete process.env.CLOUDINARY_UPLOAD_FOLDER;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_STORAGE_BUCKET;
  delete process.env.SUPABASE_QUOTE_STORAGE_BUCKET;
  delete process.env.SUPABASE_SIGNED_URL_TTL_SECONDS;
  delete process.env.SUPABASE_UPLOAD_FOLDER;
  delete process.env.IMAGE_UPLOAD_MAX_SIZE_BYTES;
}

describe("upload provider config", () => {
  afterEach(() => {
    resetEnv();
    vi.clearAllMocks();
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

  it("detects Supabase Storage only when server credentials and bucket are present", () => {
    resetEnv();
    process.env.IMAGE_UPLOAD_PROVIDER = "supabase";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_STORAGE_BUCKET = "tattoo-images";
    process.env.SUPABASE_QUOTE_STORAGE_BUCKET = "quote-images";
    process.env.SUPABASE_UPLOAD_FOLDER = "Tattoo Studio/Private";
    process.env.SUPABASE_SIGNED_URL_TTL_SECONDS = "120";

    expect(getImageUploadConfig()).toMatchObject({
      provider: "supabase",
      configured: true,
      supabaseBucket: "tattoo-images",
      supabaseQuoteBucket: "quote-images",
      supabaseFolder: "tattoo-studio/private",
      supabaseSignedUrlTtlSeconds: 120,
    });
    expect(isExternalImageUploadConfigured()).toBe(true);
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
      folder: "tattoo-studio/private",
    });
  });

  it("rejects SVG and oversized files", () => {
    expect(
      validateUploadImage(new File(["<svg />"], "bad.svg", { type: "image/svg+xml" })).ok,
    ).toBe(false);
    expect(
      validateUploadImage(new File(["x".repeat(20)], "large.png", { type: "image/png" }), 10),
    ).toEqual({ ok: false, errors: { image: "La imagen debe pesar 0 MB o menos." } });
  });

  it("rejects files whose declared MIME is image/png but bytes are SVG or text", async () => {
    await expect(
      validateUploadImageContent(new File(["<svg />"], "fake.png", { type: "image/png" })),
    ).resolves.toEqual({
      ok: false,
      errors: { image: "Solo se permiten imágenes JPG, PNG o WEBP válidas." },
    });

    await expect(
      validateUploadImageContent(new File(["not an image"], "fake.png", { type: "image/png" })),
    ).resolves.toMatchObject({ ok: false });
  });

  it("rejects GIF uploads with a clear Spanish error", async () => {
    expect(
      validateUploadImage(new File([gifBytes], "animated.gif", { type: "image/gif" })),
    ).toEqual({
      ok: false,
      errors: {
        image:
          "No se permiten GIF por ahora porque el procesamiento seguro de imágenes animadas está fuera de alcance.",
      },
    });

    await expect(
      validateUploadImageContent(new File([gifBytes], "animated.png", { type: "image/png" })),
    ).resolves.toEqual({
      ok: false,
      errors: {
        image:
          "No se permiten GIF por ahora porque el procesamiento seguro de imágenes animadas está fuera de alcance.",
      },
    });
  });

  it("returns a clear Spanish disabled error without crashing", async () => {
    resetEnv();

    await expect(
      uploadImageToExternalProvider(
        await createImageFile({ name: "client-name.png" }),
        "portfolio",
      ),
    ).resolves.toMatchObject({
      ok: false,
      status: 503,
      errors: { image: expect.stringContaining("Supabase Storage") },
    });
  });

  it("uploads to Supabase Storage with a random object path without the original filename", async () => {
    resetEnv();
    process.env.IMAGE_UPLOAD_PROVIDER = "supabase";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_STORAGE_BUCKET = "tattoo-images";
    process.env.SUPABASE_UPLOAD_FOLDER = "webtatuajes";
    supabaseMocks.upload.mockResolvedValue({ data: { path: "stored" }, error: null });
    supabaseMocks.getPublicUrl.mockReturnValue({
      data: {
        publicUrl: "https://project.supabase.co/storage/v1/object/public/tattoo-images/path.png",
      },
    });

    const result = await uploadImageToExternalProvider(
      await createImageFile({ width: 2400, height: 1600, name: "client-original-name.png" }),
      "portfolio",
    );

    expect(result).toMatchObject({
      ok: true,
      image: {
        provider: "supabase",
        secureUrl: "https://project.supabase.co/storage/v1/object/public/tattoo-images/path.png",
        mimeType: "image/webp",
        width: 1620,
        height: 1080,
      },
    });
    expect(supabaseMocks.createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "service-role",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    expect(supabaseMocks.from).toHaveBeenCalledWith("tattoo-images");
    const objectPath = supabaseMocks.upload.mock.calls[0]?.[0] as string;
    expect(objectPath).toMatch(/^webtatuajes\/portfolio\/[a-f0-9]{32}\.webp$/);
    expect(objectPath).not.toContain("client-original-name");
    const uploadedBlob = supabaseMocks.upload.mock.calls[0]?.[1] as Blob;
    expect(uploadedBlob.type).toBe("image/webp");
    expect(uploadedBlob.size).toBeLessThan(5 * 1024 * 1024);
  });

  it("does not enlarge small images while recompressing and stripping metadata", async () => {
    resetEnv();
    process.env.IMAGE_UPLOAD_PROVIDER = "supabase";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_STORAGE_BUCKET = "tattoo-images";
    supabaseMocks.upload.mockResolvedValue({ data: { path: "stored" }, error: null });
    supabaseMocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.example.test/image.webp" },
    });

    const result = await uploadImageToExternalProvider(
      await createImageFile({ width: 320, height: 180 }),
      "portfolio",
    );

    expect(result).toMatchObject({
      ok: true,
      image: { mimeType: "image/webp", width: 320, height: 180 },
    });
    const uploadedBlob = supabaseMocks.upload.mock.calls[0]?.[1] as Blob;
    const metadata = await sharp(Buffer.from(await uploadedBlob.arrayBuffer())).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.exif).toBeUndefined();
    expect(metadata.width).toBe(320);
    expect(metadata.height).toBe(180);
  });

  it("auto-orients JPEG uploads with EXIF orientation metadata", async () => {
    resetEnv();
    process.env.IMAGE_UPLOAD_PROVIDER = "supabase";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_STORAGE_BUCKET = "tattoo-images";
    supabaseMocks.upload.mockResolvedValue({ data: { path: "stored" }, error: null });
    supabaseMocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.example.test/oriented.webp" },
    });

    const file = await createExifOrientedJpegFile();

    await expect(sharp(Buffer.from(await file.arrayBuffer())).metadata()).resolves.toMatchObject({
      width: 12,
      height: 20,
      orientation: 6,
    });

    const result = await uploadImageToExternalProvider(file, "portfolio");

    expect(result).toMatchObject({
      ok: true,
      image: { mimeType: "image/webp", width: 20, height: 12 },
    });
    const uploadedBlob = supabaseMocks.upload.mock.calls[0]?.[1] as Blob;
    const metadata = await sharp(Buffer.from(await uploadedBlob.arrayBuffer())).metadata();
    expect(metadata).toMatchObject({ format: "webp", width: 20, height: 12 });
    expect(metadata.orientation).toBeUndefined();
  });

  it("rejects images when the processed WebP exceeds the configured max size", async () => {
    resetEnv();
    process.env.IMAGE_UPLOAD_PROVIDER = "supabase";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_STORAGE_BUCKET = "tattoo-images";
    process.env.IMAGE_UPLOAD_MAX_SIZE_BYTES = "3000";

    const result = await uploadImageToExternalProvider(
      await createLowQualityWebpFile(),
      "portfolio",
    );

    expect(result).toEqual({
      ok: false,
      status: 400,
      errors: {
        image:
          "La imagen procesada debe pesar 3000 bytes o menos. Prueba con una imagen más liviana o con menos detalle.",
      },
    });
    expect(supabaseMocks.upload).not.toHaveBeenCalled();
  });

  it("uploads quote references to Supabase without requiring a permanent public URL", async () => {
    resetEnv();
    process.env.IMAGE_UPLOAD_PROVIDER = "supabase";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_STORAGE_BUCKET = "tattoo-images";
    process.env.SUPABASE_QUOTE_STORAGE_BUCKET = "private-quote-images";
    process.env.SUPABASE_UPLOAD_FOLDER = "webtatuajes";
    supabaseMocks.upload.mockResolvedValue({ data: { path: "stored" }, error: null });

    const result = await uploadImageToExternalProvider(
      await createImageFile({ name: "client-original-name.png" }),
      "quote-reference",
    );

    expect(result).toMatchObject({
      ok: true,
      image: {
        provider: "supabase",
        providerId: expect.stringMatching(/^webtatuajes\/quote-references\/[a-f0-9]{32}\.webp$/),
        secureUrl: null,
        mimeType: "image/webp",
      },
    });
    expect(supabaseMocks.from).toHaveBeenCalledWith("private-quote-images");
    expect(supabaseMocks.getPublicUrl).not.toHaveBeenCalled();
  });

  it("creates short-lived Supabase signed URLs for private quote objects", async () => {
    resetEnv();
    process.env.IMAGE_UPLOAD_PROVIDER = "supabase";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_STORAGE_BUCKET = "tattoo-images";
    process.env.SUPABASE_QUOTE_STORAGE_BUCKET = "private-quote-images";
    process.env.SUPABASE_SIGNED_URL_TTL_SECONDS = "60";
    supabaseMocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://project.supabase.co/signed/ref.png?token=short" },
      error: null,
    });

    await expect(
      createSupabaseStorageSignedUrl("webtatuajes/quote-references/ref.png"),
    ).resolves.toEqual({
      ok: true,
      signedUrl: "https://project.supabase.co/signed/ref.png?token=short",
    });

    expect(supabaseMocks.from).toHaveBeenCalledWith("private-quote-images");
    expect(supabaseMocks.createSignedUrl).toHaveBeenCalledWith(
      "webtatuajes/quote-references/ref.png",
      60,
    );
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
        width: 800,
        height: 600,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadImageToExternalProvider(
      await createImageFile({ width: 1024, height: 768, name: "client-original-name.png" }),
      "portfolio",
    );

    expect(result).toMatchObject({
      ok: true,
      image: {
        providerId: "webtatuajes/portfolio/random-id",
        mimeType: "image/webp",
        sizeBytes: expect.any(Number),
        width: 1024,
        height: 768,
      },
    });
    const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect(body.get("public_id")).not.toContain("client-original-name");
    expect(body.get("file")).toBeInstanceOf(Blob);
    expect((body.get("file") as Blob).type).toBe("image/webp");
  });

  it("rejects disguised image/png content before calling Supabase", async () => {
    resetEnv();
    process.env.IMAGE_UPLOAD_PROVIDER = "supabase";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_STORAGE_BUCKET = "tattoo-images";
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
    expect(supabaseMocks.upload).not.toHaveBeenCalled();
  });
});
