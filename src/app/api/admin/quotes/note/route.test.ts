import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { updateQuoteRequestInternalNote } from "@/lib/quotes/quote-request";

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
  updateQuoteRequestInternalNote: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const updateQuoteRequestInternalNoteMock = vi.mocked(updateQuoteRequestInternalNote);

function request(body: unknown) {
  return new Request("http://localhost/api/admin/quotes/note", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("admin quote note route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    updateQuoteRequestInternalNoteMock.mockResolvedValue({
      ok: true,
      quoteId: "quote-1",
      internalNote: "Llamar mañana.",
    });
  });

  it("revalidates admin role before updating an internal note", async () => {
    const response = await POST(request({ quoteId: "quote-1", internalNote: "Llamar mañana." }));

    await expect(response.json()).resolves.toEqual({
      quoteId: "quote-1",
      internalNote: "Llamar mañana.",
    });
    expect(response.status).toBe(200);
    expect(getServerAuthStatusFromIdTokenMock).toHaveBeenCalledWith("id-token");
    expect(updateQuoteRequestInternalNoteMock).toHaveBeenCalledWith(
      expect.anything(),
      "quote-1",
      "Llamar mañana.",
    );
  });

  it("rejects non-admin users before calling the update helper", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(request({ quoteId: "quote-1", internalNote: "nota" }));

    expect(response.status).toBe(403);
    expect(updateQuoteRequestInternalNoteMock).not.toHaveBeenCalled();
  });

  it("returns validation errors from the update helper", async () => {
    updateQuoteRequestInternalNoteMock.mockResolvedValue({
      ok: false,
      status: 400,
      error: "La nota interna es demasiado larga.",
    });

    const response = await POST(request({ quoteId: "quote-1", internalNote: "x".repeat(2001) }));

    await expect(response.json()).resolves.toEqual({
      error: "La nota interna es demasiado larga.",
    });
    expect(response.status).toBe(400);
  });
});
