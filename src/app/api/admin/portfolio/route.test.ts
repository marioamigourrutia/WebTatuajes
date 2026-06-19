import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  createPortfolioItemFromFormData,
  listRecentAdminPortfolioItems,
} from "@/lib/portfolio/admin-portfolio";

vi.mock("@/lib/auth/bearer", () => ({
  getBearerToken: vi.fn(() => "id-token"),
}));

vi.mock("@/lib/auth/server", () => ({
  getServerAuthStatusFromIdToken: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminFirestore: vi.fn(),
}));

vi.mock("@/lib/portfolio/admin-portfolio", () => ({
  createPortfolioItemFromFormData: vi.fn(),
  listRecentAdminPortfolioItems: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const createPortfolioItemFromFormDataMock = vi.mocked(createPortfolioItemFromFormData);
const listRecentAdminPortfolioItemsMock = vi.mocked(listRecentAdminPortfolioItems);

describe("admin portfolio route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    createPortfolioItemFromFormDataMock.mockResolvedValue({ ok: true, id: "item-123" });
    listRecentAdminPortfolioItemsMock.mockResolvedValue([]);
  });

  it("revalidates admin role before creating an item", async () => {
    const formData = new FormData();
    formData.set("title", "Flor");

    const response = await POST(
      new Request("http://localhost/api/admin/portfolio", { method: "POST", body: formData }),
    );

    await expect(response.json()).resolves.toEqual({ id: "item-123" });
    expect(response.status).toBe(201);
    expect(getServerAuthStatusFromIdTokenMock).toHaveBeenCalledWith("id-token");
    expect(createPortfolioItemFromFormDataMock).toHaveBeenCalledWith(expect.anything());
  });

  it("rejects non-admin users before creating an item", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/portfolio", { method: "POST", body: new FormData() }),
    );

    expect(response.status).toBe(403);
    expect(createPortfolioItemFromFormDataMock).not.toHaveBeenCalled();
  });

  it("lists recent portfolio items for admin users", async () => {
    listRecentAdminPortfolioItemsMock.mockResolvedValue([
      {
        id: "item-123",
        title: "Flor",
        style: "Blackwork",
        bodyArea: "Brazo",
        description: "Descripción",
        tags: [],
        published: true,
        featured: false,
        gradient: "linear-gradient(#000, #111)",
        createdAt: null,
        imagePath: null,
        imageMimeType: null,
        imageSizeBytes: null,
        imageOriginalFilename: null,
      },
    ]);

    const response = await GET(new Request("http://localhost/api/admin/portfolio"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ items: [{ id: "item-123" }] });
  });
});
