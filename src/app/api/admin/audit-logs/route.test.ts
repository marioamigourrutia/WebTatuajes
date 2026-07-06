import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { listRecentAuditLogs } from "@/lib/audit-log";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

vi.mock("@/lib/auth/bearer", () => ({
  getBearerToken: vi.fn(() => "id-token"),
}));

vi.mock("@/lib/auth/server", () => ({
  getServerAuthStatusFromIdToken: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
  listRecentAuditLogs: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminFirestore: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const listRecentAuditLogsMock = vi.mocked(listRecentAuditLogs);

describe("admin audit logs route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    listRecentAuditLogsMock.mockResolvedValue([
      {
        id: "audit-1",
        action: "quote.status_updated",
        actorUid: "admin-a",
        actorEmail: "admin@example.test",
        targetType: "quote",
        targetId: "quote-a",
        createdAt: null,
        metadata: { status: "contacted" },
      },
    ]);
  });

  it("requires server-side admin validation before listing audit logs", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/audit-logs", { method: "POST" }),
    );

    await expect(response.json()).resolves.toEqual({
      auditLogs: [expect.objectContaining({ action: "quote.status_updated" })],
    });
    expect(response.status).toBe(200);
    expect(getServerAuthStatusFromIdTokenMock).toHaveBeenCalledWith("id-token");
    expect(listRecentAuditLogsMock).toHaveBeenCalledWith(expect.anything());
  });

  it("rejects non-admin users", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/audit-logs", { method: "POST" }),
    );

    expect(response.status).toBe(403);
    expect(listRecentAuditLogsMock).not.toHaveBeenCalled();
  });
});
