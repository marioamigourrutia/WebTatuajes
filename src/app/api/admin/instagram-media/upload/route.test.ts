import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { uploadImageToExternalProvider } from "@/lib/images/upload-provider";
import { createManualInstagramMedia } from "@/lib/instagram/instagram-media";

vi.mock("@/lib/auth/bearer", () => ({ getBearerToken: vi.fn(() => "id-token") }));
vi.mock("@/lib/auth/server", () => ({ getServerAuthStatusFromIdToken: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({ getFirebaseAdminFirestore: vi.fn() }));
vi.mock("@/lib/images/upload-provider", () => ({ uploadImageToExternalProvider: vi.fn() }));
vi.mock("@/lib/instagram/instagram-media", () => ({ createManualInstagramMedia: vi.fn() }));

const authMock = vi.mocked(getServerAuthStatusFromIdToken);
const firestoreMock = vi.mocked(getFirebaseAdminFirestore);
const uploadMock = vi.mocked(uploadImageToExternalProvider);
const createMediaMock = vi.mocked(createManualInstagramMedia);

function buildRequest() {
  const formData = new FormData();
  formData.set("image", new File([new Uint8Array([1, 2, 3])], "hero.jpg", { type: "image/jpeg" }));
  formData.set("caption", "Hero black and grey");
  formData.set("showOnHome", "on");
  formData.set("pinned", "on");
  return new Request("http://localhost/api/admin/instagram-media/upload", {
    method: "POST",
    body: formData,
  });
}

describe("admin editorial image upload route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    firestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    uploadMock.mockResolvedValue({
      ok: true,
      image: {
        provider: "cloudinary",
        providerId: "editorial/hero",
        secureUrl: "https://cdn.example.test/editorial/hero.webp",
        mimeType: "image/webp",
        sizeBytes: 1200,
        width: 1200,
        height: 1600,
      },
    });
    createMediaMock.mockResolvedValue({ ok: true, id: "media-hero" });
  });

  it("rejects non-admin uploads before processing the file", async () => {
    authMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(buildRequest());

    expect(response.status).toBe(403);
    expect(uploadMock).not.toHaveBeenCalled();
    expect(createMediaMock).not.toHaveBeenCalled();
  });

  it("uploads a validated image and registers it as home media", async () => {
    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      id: "media-hero",
      mediaUrl: "https://cdn.example.test/editorial/hero.webp",
    });

    expect(uploadMock).toHaveBeenCalledTimes(1);
    const [uploadedFile, purpose] = uploadMock.mock.calls[0] ?? [];
    expect(purpose).toBe("editorial");
    expect(uploadedFile).toEqual(
      expect.objectContaining({
        type: "image/jpeg",
        size: expect.any(Number),
      }),
    );
    expect(uploadedFile?.size).toBeGreaterThan(0);

    expect(createMediaMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaType: "IMAGE",
        mediaUrl: "https://cdn.example.test/editorial/hero.webp",
        showOnHome: true,
        pinned: true,
      }),
      expect.anything(),
    );
  });

  it("returns a controlled error when the image provider is unavailable", async () => {
    uploadMock.mockResolvedValue({
      ok: false,
      status: 503,
      errors: { image: "La carga de imágenes está deshabilitada." },
    });

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.errors.image).toMatch(/deshabilitada/i);
    expect(createMediaMock).not.toHaveBeenCalled();
  });
});
