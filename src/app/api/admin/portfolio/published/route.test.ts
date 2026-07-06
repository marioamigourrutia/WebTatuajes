import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { updatePortfolioPublishedStatus } from "@/lib/portfolio/admin-portfolio";

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
  updatePortfolioPublishedStatus: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const updatePortfolioPublishedStatusMock = vi.mocked(updatePortfolioPublishedStatus);

function request(body: unknown) {
  return new Request("http://localhost/api/admin/portfolio/published", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("admin portfolio published route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    updatePortfolioPublishedStatusMock.mockResolvedValue({
      ok: true,
      itemId: "item-123",
      published: true,
    });
  });

  it("revalidates admin role before toggling published state", async () => {
    const response = await POST(request({ itemId: "item-123", published: true }));

    await expect(response.json()).resolves.toEqual({ itemId: "item-123", published: true });
    expect(response.status).toBe(200);
    expect(getServerAuthStatusFromIdTokenMock).toHaveBeenCalledWith("id-token");
    expect(updatePortfolioPublishedStatusMock).toHaveBeenCalledWith(
      expect.anything(),
      "item-123",
      true,
    );
  });

  it("rejects non-admin users before calling the update helper", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(request({ itemId: "item-123", published: true }));

    expect(response.status).toBe(403);
    expect(updatePortfolioPublishedStatusMock).not.toHaveBeenCalled();
  });
});
