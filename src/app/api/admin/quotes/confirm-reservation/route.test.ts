import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { confirmQuoteReservation } from "@/lib/quotes/quote-request";

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
  confirmQuoteReservation: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const confirmQuoteReservationMock = vi.mocked(confirmQuoteReservation);

function request(body: unknown) {
  return new Request("http://localhost/api/admin/quotes/confirm-reservation", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("admin quote reservation confirmation route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    confirmQuoteReservationMock.mockResolvedValue({
      ok: true,
      quoteId: "quote-1",
      calendarDateStatus: "CONFIRMED",
    });
  });

  it("rejects unauthenticated requests before confirming a reservation", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: false,
      admin: false,
      profile: null,
    });

    const response = await POST(request({ quoteId: "quote-1" }));

    expect(response.status).toBe(401);
    expect(getFirebaseAdminFirestoreMock).not.toHaveBeenCalled();
    expect(confirmQuoteReservationMock).not.toHaveBeenCalled();
  });

  it("rejects non-admin users before confirming a reservation", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(request({ quoteId: "quote-1" }));

    expect(response.status).toBe(403);
    expect(getFirebaseAdminFirestoreMock).not.toHaveBeenCalled();
    expect(confirmQuoteReservationMock).not.toHaveBeenCalled();
  });
});
