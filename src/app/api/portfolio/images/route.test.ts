import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getFirebaseAdminFirestore, getFirebaseAdminStorageBucket } from "@/lib/firebase/admin";
import { getPublishedPortfolioImageFile } from "@/lib/portfolio/admin-portfolio";

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminFirestore: vi.fn(),
  getFirebaseAdminStorageBucket: vi.fn(),
}));

vi.mock("@/lib/portfolio/admin-portfolio", () => ({
  getPublishedPortfolioImageFile: vi.fn(),
}));

const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const getFirebaseAdminStorageBucketMock = vi.mocked(getFirebaseAdminStorageBucket);
const getPublishedPortfolioImageFileMock = vi.mocked(getPublishedPortfolioImageFile);
const download = vi.fn().mockResolvedValue([Buffer.from("image-bytes")]);
const file = vi.fn(() => ({ download }));

function request(path = "/api/portfolio/images?itemId=item-123") {
  return new Request(`http://localhost${path}`, { method: "GET" });
}

describe("public portfolio image proxy route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    download.mockResolvedValue([Buffer.from("image-bytes")]);
    file.mockClear();
    getFirebaseAdminStorageBucketMock.mockReturnValue({ file } as never);
    getPublishedPortfolioImageFileMock.mockResolvedValue({
      ok: true,
      file: {
        storagePath: "portfolio-admin/item-123/main.webp",
        originalFilename: "private-original.webp",
        mimeType: "image/webp",
      },
    });
  });

  it("returns public image bytes with a safe public filename", async () => {
    const response = await GET(request());

    await expect(response.text()).resolves.toBe("image-bytes");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="portfolio-item-123.webp"',
    );
    expect(response.headers.get("content-disposition")).not.toContain("private-original.webp");
    expect(getPublishedPortfolioImageFileMock).toHaveBeenCalledWith(expect.anything(), "item-123");
    expect(file).toHaveBeenCalledWith("portfolio-admin/item-123/main.webp");
  });

  it("keeps content type from validated image metadata", async () => {
    getPublishedPortfolioImageFileMock.mockResolvedValue({
      ok: true,
      file: {
        storagePath: "portfolio-admin/item-123/main.png",
        originalFilename: "secret-upload.png",
        mimeType: "image/png",
      },
    });

    const response = await GET(request());

    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="portfolio-item-123.png"',
    );
    expect(response.headers.get("content-disposition")).not.toContain("secret-upload.png");
  });
});
