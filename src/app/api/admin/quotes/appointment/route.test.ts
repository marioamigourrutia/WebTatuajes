import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { decideQuoteAppointment } from "@/lib/quotes/quote-request";
import { POST } from "./route";

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
  decideQuoteAppointment: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const decideQuoteAppointmentMock = vi.mocked(decideQuoteAppointment);
const addAuditLogMock = vi.fn();

function request(body: unknown) {
  return new Request("http://localhost/api/admin/quotes/appointment", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("admin quote appointment route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({
      collection: vi.fn((path: string) => (path === "audit_logs" ? { add: addAuditLogMock } : {})),
    } as never);
    decideQuoteAppointmentMock.mockResolvedValue({
      ok: true,
      quoteId: "quote-1",
      action: "approve",
      quoteStatus: "contacted",
      calendarDateStatus: "CONFIRMED",
    });
  });

  it("revalidates admin role before approving an appointment", async () => {
    const response = await POST(request({ quoteId: "quote-1", action: "approve" }));

    await expect(response.json()).resolves.toEqual({
      quoteId: "quote-1",
      action: "approve",
      status: "contacted",
      calendarDateStatus: "CONFIRMED",
    });
    expect(response.status).toBe(200);
    expect(getServerAuthStatusFromIdTokenMock).toHaveBeenCalledWith("id-token");
    expect(decideQuoteAppointmentMock).toHaveBeenCalledWith(
      expect.anything(),
      "quote-1",
      "approve",
    );
    expect(addAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "quote.appointment_approve",
        actor_uid: "admin-a",
        target_type: "quote",
        target_id: "quote-1",
        metadata: {
          action: "approve",
          status: "contacted",
          calendarDateStatus: "CONFIRMED",
        },
      }),
    );
  });

  it("rejects non-admin users before deciding an appointment", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(request({ quoteId: "quote-1", action: "reject" }));

    expect(response.status).toBe(403);
    expect(decideQuoteAppointmentMock).not.toHaveBeenCalled();
  });
});
