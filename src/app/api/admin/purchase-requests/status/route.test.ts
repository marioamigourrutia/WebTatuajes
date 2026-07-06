import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { updatePurchaseRequestStatus } from "@/lib/shop/purchase-request";

vi.mock("@/lib/auth/bearer", () => ({ getBearerToken: vi.fn(() => "id-token") }));
vi.mock("@/lib/auth/server", () => ({ getServerAuthStatusFromIdToken: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({ getFirebaseAdminFirestore: vi.fn() }));
vi.mock("@/lib/shop/purchase-request", () => ({ updatePurchaseRequestStatus: vi.fn() }));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const updatePurchaseRequestStatusMock = vi.mocked(updatePurchaseRequestStatus);

function request(body: unknown) {
  return new Request("http://localhost/api/admin/purchase-requests/status", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("admin purchase request status route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    updatePurchaseRequestStatusMock.mockResolvedValue({
      ok: true,
      purchaseRequestId: "purchase-1",
      status: "reserved",
    });
  });

  it("requires server-side admin validation before status changes", async () => {
    const response = await POST(request({ purchaseRequestId: "purchase-1", status: "reserved" }));

    await expect(response.json()).resolves.toEqual({
      purchaseRequestId: "purchase-1",
      status: "reserved",
    });
    expect(updatePurchaseRequestStatusMock).toHaveBeenCalledWith(
      expect.anything(),
      "purchase-1",
      "reserved",
    );
  });

  it("rejects non-admin users before mutations", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(request({ purchaseRequestId: "purchase-1", status: "sold" }));

    expect(response.status).toBe(403);
    expect(updatePurchaseRequestStatusMock).not.toHaveBeenCalled();
  });
});
