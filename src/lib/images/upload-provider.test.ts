import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultImageUploadMaxSizeBytes,
  getImageUploadConfig,
  isExternalImageUploadConfigured,
  uploadImageToExternalProvider,
  validateUploadImage,
  validateUploadImageContent,
} from "./upload-provider";

const originalEnv = { ...process.env };
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function resetEnv() {
  process.env = { ...originalEnv };
  delete process.env.IMAGE_UPLOAD_PROVIDER;
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  delete process.env.CLOUDINARY_UPLOAD_FOLDER;
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
      errors: { image: "Solo se permiten imágenes JPG, PNG, WEBP o GIF válidas." },
    });

    await expect(
      validateUploadImageContent(new File(["not an image"], "fake.png", { type: "image/png" })),
    ).resolves.toMatchObject({ ok: false });
  });

  it("returns a clear Spanish disabled error without crashing", async () => {
    resetEnv();

    await expect(
      uploadImageToExternalProvider(
        new File([pngBytes], "client-name.png", { type: "image/png" }),
        "portfolio",
      ),
    ).resolves.toMatchObject({
      ok: false,
      status: 503,
      errors: { image: expect.stringContaining("proveedor externo") },
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
        width: 800,
        height: 600,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadImageToExternalProvider(
      new File([pngBytes], "client-original-name.png", { type: "image/png" }),
      "portfolio",
    );

    expect(result).toMatchObject({
      ok: true,
      image: { providerId: "webtatuajes/portfolio/random-id" },
    });
    const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect(body.get("public_id")).not.toContain("client-original-name");
  });

  it("rejects disguised image/png content before calling Cloudinary", async () => {
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
      errors: { image: "Solo se permiten imágenes JPG, PNG, WEBP o GIF válidas." },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
