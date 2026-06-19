import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { updateQuoteRequestStatus } from "@/lib/quotes/quote-request";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";

vi.mock("@/lib/auth/bearer", () => ({
  getBearerToken: vi.fn(() => "id-token"),
}));

vi.mock("@/lib/auth/server", () => ({
  getServerAuthStatusFromIdToken: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminFirestore: vi.fn(),
}));

vi.mock("@/lib/quotes/quote-request", () => ({
  updateQuoteRequestStatus: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const updateQuoteRequestStatusMock = vi.mocked(updateQuoteRequestStatus);

function request(body: unknown) {
  return new Request("http://localhost/api/admin/quotes/status", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("admin quote status route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    updateQuoteRequestStatusMock.mockResolvedValue({
      ok: true,
      quoteId: "quote-1",
      quoteStatus: "contacted",
      calendarDateStatus: "PENDING_CONFIRMATION",
    });
  });

  it("revalidates admin role before updating a quote status", async () => {
    const response = await POST(request({ quoteId: "quote-1", status: "contacted" }));

    await expect(response.json()).resolves.toEqual({
      quoteId: "quote-1",
      status: "contacted",
      calendarDateStatus: "PENDING_CONFIRMATION",
    });
    expect(response.status).toBe(200);
    expect(getServerAuthStatusFromIdTokenMock).toHaveBeenCalledWith("id-token");
    expect(updateQuoteRequestStatusMock).toHaveBeenCalledWith(
      expect.anything(),
      "quote-1",
      "contacted",
    );
  });

  it("rejects non-admin users before calling the update helper", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(request({ quoteId: "quote-1", status: "contacted" }));

    expect(response.status).toBe(403);
    expect(updateQuoteRequestStatusMock).not.toHaveBeenCalled();
  });

  it("returns validation errors from the update helper", async () => {
    updateQuoteRequestStatusMock.mockResolvedValue({
      ok: false,
      status: 400,
      error: "Estado de cotización no permitido.",
    });

    const response = await POST(request({ quoteId: "quote-1", status: "approved" }));

    await expect(response.json()).resolves.toEqual({ error: "Estado de cotización no permitido." });
    expect(response.status).toBe(400);
  });
});
