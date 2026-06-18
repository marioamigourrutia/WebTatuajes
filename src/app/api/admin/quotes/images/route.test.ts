import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore, getFirebaseAdminStorageBucket } from "@/lib/firebase/admin";
import { getAdminQuoteReferenceImageFile } from "@/lib/quotes/quote-request";

vi.mock("@/lib/auth/bearer", () => ({
  getBearerToken: vi.fn(() => "id-token"),
}));

vi.mock("@/lib/auth/server", () => ({
  getServerAuthStatusFromIdToken: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminFirestore: vi.fn(),
  getFirebaseAdminStorageBucket: vi.fn(),
}));

vi.mock("@/lib/quotes/quote-request", () => ({
  getAdminQuoteReferenceImageFile: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const getFirebaseAdminStorageBucketMock = vi.mocked(getFirebaseAdminStorageBucket);
const getAdminQuoteReferenceImageFileMock = vi.mocked(getAdminQuoteReferenceImageFile);
const download = vi.fn().mockResolvedValue([Buffer.from("image-bytes")]);
const file = vi.fn(() => ({ download }));

function request(path = "/api/admin/quotes/images?imageId=image-123") {
  return new Request(`http://localhost${path}`, { method: "GET" });
}

describe("admin quote image proxy route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    download.mockResolvedValue([Buffer.from("image-bytes")]);
    file.mockClear();
    getFirebaseAdminStorageBucketMock.mockReturnValue({ file } as never);
    getAdminQuoteReferenceImageFileMock.mockResolvedValue({
      ok: true,
      file: {
        storagePath: "quote-images/anonymous/quote-1/reference.png",
        originalFilename: "reference.png",
        mimeType: "image/png",
      },
    });
  });

  it("revalidates admin role and returns private image bytes through Admin Storage", async () => {
    const response = await GET(request());

    await expect(response.text()).resolves.toBe("image-bytes");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(getServerAuthStatusFromIdTokenMock).toHaveBeenCalledWith("id-token");
    expect(getAdminQuoteReferenceImageFileMock).toHaveBeenCalledWith(
      expect.anything(),
      "image-123",
      undefined,
    );
  });

  it("rejects non-admin users before reading image metadata", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(getAdminQuoteReferenceImageFileMock).not.toHaveBeenCalled();
  });

  it("returns validation errors before downloading from Storage", async () => {
    getAdminQuoteReferenceImageFileMock.mockResolvedValue({
      ok: false,
      status: 400,
      error: "ID de imagen inválido.",
    });

    const response = await GET(request("/api/admin/quotes/images?imageId=../bad"));

    await expect(response.json()).resolves.toEqual({ error: "ID de imagen inválido." });
    expect(response.status).toBe(400);
    expect(file).not.toHaveBeenCalled();
  });

  it("returns a controlled error when the private Storage object cannot be read", async () => {
    download.mockRejectedValue(new Error("missing object"));

    const response = await GET(request());

    await expect(response.json()).resolves.toEqual({
      error: "No se pudo leer la imagen privada.",
    });
    expect(response.status).toBe(404);
  });
});
