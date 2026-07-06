import { describe, expect, it, vi } from "vitest";
import { listRecentAuditLogs } from "./audit-log";

describe("audit log visibility", () => {
  it("serializes recent audit logs without sensitive metadata", async () => {
    const get = async () => ({
      docs: [
        {
          id: "audit-1",
          data: () => ({
            action: "quote.status_updated",
            actor_uid: "admin-a",
            actor_email: "admin@example.test",
            target_type: "quote",
            target_id: "quote-a",
            created_at: new Date("2026-07-05T12:00:00.000Z"),
            metadata: {
              status: "contacted",
              authorizationToken: "secret",
              nested: { unsafe: true },
            },
          }),
        },
      ],
    });
    const limit = vi.fn(() => ({ get }));
    const orderBy = vi.fn(() => ({ limit }));
    const firestore = { collection: vi.fn(() => ({ orderBy })) };

    await expect(listRecentAuditLogs(firestore)).resolves.toEqual([
      {
        id: "audit-1",
        action: "quote.status_updated",
        actorUid: "admin-a",
        actorEmail: "admin@example.test",
        targetType: "quote",
        targetId: "quote-a",
        createdAt: "2026-07-05T12:00:00.000Z",
        metadata: { status: "contacted" },
      },
    ]);
    expect(firestore.collection).toHaveBeenCalledWith("audit_logs");
    expect(orderBy).toHaveBeenCalledWith("created_at", "desc");
    expect(limit).toHaveBeenCalledWith(25);
  });
});
