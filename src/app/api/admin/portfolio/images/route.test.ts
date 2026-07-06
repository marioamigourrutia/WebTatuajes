import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore, getFirebaseAdminStorageBucket } from "@/lib/firebase/admin";
import { getAdminPortfolioImageFile } from "@/lib/portfolio/admin-portfolio";

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

vi.mock("@/lib/portfolio/admin-portfolio", () => ({
  getAdminPortfolioImageFile: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const getFirebaseAdminStorageBucketMock = vi.mocked(getFirebaseAdminStorageBucket);
const getAdminPortfolioImageFileMock = vi.mocked(getAdminPortfolioImageFile);
const download = vi.fn().mockResolvedValue([Buffer.from("image-bytes")]);
const file = vi.fn(() => ({ download }));

function request(path = "/api/admin/portfolio/images?itemId=item-123") {
  return new Request(`http://localhost${path}`, { method: "GET" });
}

describe("admin portfolio image proxy route", () => {
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
    getAdminPortfolioImageFileMock.mockResolvedValue({
      ok: true,
      file: {
        storagePath: "portfolio-admin/item-123/main.webp",
        originalFilename: "main.webp",
        mimeType: "image/webp",
      },
    });
  });

  it("revalidates admin role and returns private portfolio image bytes", async () => {
    const response = await GET(request());

    await expect(response.text()).resolves.toBe("image-bytes");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(getServerAuthStatusFromIdTokenMock).toHaveBeenCalledWith("id-token");
    expect(getAdminPortfolioImageFileMock).toHaveBeenCalledWith(expect.anything(), "item-123");
    expect(file).toHaveBeenCalledWith("portfolio-admin/item-123/main.webp");
  });

  it("rejects unauthenticated requests before reading image metadata", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: false,
      admin: false,
      profile: null,
    });

    const response = await GET(request());

    await expect(response.json()).resolves.toEqual({ error: "No autenticado." });
    expect(response.status).toBe(401);
    expect(getAdminPortfolioImageFileMock).not.toHaveBeenCalled();
  });

  it("rejects non-admin users before reading image metadata", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(getAdminPortfolioImageFileMock).not.toHaveBeenCalled();
  });

  it("returns validation errors before downloading from Storage", async () => {
    getAdminPortfolioImageFileMock.mockResolvedValue({
      ok: false,
      status: 422,
      error: "La metadata de imagen es inválida.",
    });

    const response = await GET(request());

    await expect(response.json()).resolves.toEqual({ error: "La metadata de imagen es inválida." });
    expect(response.status).toBe(422);
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
