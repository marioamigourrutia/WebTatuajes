import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { listRecentPurchaseRequests } from "@/lib/shop/purchase-request";

vi.mock("@/lib/auth/bearer", () => ({
  getBearerToken: vi.fn(() => "id-token"),
}));

vi.mock("@/lib/auth/server", () => ({
  getServerAuthStatusFromIdToken: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminFirestore: vi.fn(),
}));

vi.mock("@/lib/shop/purchase-request", () => ({
  listRecentPurchaseRequests: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const listRecentPurchaseRequestsMock = vi.mocked(listRecentPurchaseRequests);

describe("admin purchase requests route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    listRecentPurchaseRequestsMock.mockResolvedValue([
      {
        id: "purchase-1",
        purchaseCode: "COM-2026-ABCDE",
        createdAt: null,
        customerName: "Ana Cliente",
        phone: "+56 9 1234 5678",
        email: null,
        productCode: "OBR-001",
        productTitle: "Peonía en línea fina",
        priceClp: 85000,
        status: "pending",
        whatsappUrl: null,
      },
    ]);
  });

  it("requires server-side admin validation before listing purchase requests", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/purchase-requests", { method: "POST" }),
    );

    await expect(response.json()).resolves.toEqual({
      purchaseRequests: [expect.objectContaining({ purchaseCode: "COM-2026-ABCDE" })],
    });
    expect(response.status).toBe(200);
    expect(getServerAuthStatusFromIdTokenMock).toHaveBeenCalledWith("id-token");
    expect(listRecentPurchaseRequestsMock).toHaveBeenCalledWith(expect.anything());
  });

  it("rejects non-admin users", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/purchase-requests", { method: "POST" }),
    );

    expect(response.status).toBe(403);
    expect(listRecentPurchaseRequestsMock).not.toHaveBeenCalled();
  });

  it("returns 503 when Firebase Admin is unavailable", async () => {
    getFirebaseAdminFirestoreMock.mockReturnValue(null);

    const response = await POST(
      new Request("http://localhost/api/admin/purchase-requests", { method: "POST" }),
    );

    expect(response.status).toBe(503);
  });
});
