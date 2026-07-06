import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { syncInstagramMediaFromGraph } from "@/lib/instagram/instagram-media";

vi.mock("@/lib/auth/bearer", () => ({
  getBearerToken: vi.fn(() => "id-token"),
}));

vi.mock("@/lib/auth/server", () => ({
  getServerAuthStatusFromIdToken: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminFirestore: vi.fn(),
}));

vi.mock("@/lib/instagram/instagram-media", () => ({
  syncInstagramMediaFromGraph: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const syncInstagramMediaFromGraphMock = vi.mocked(syncInstagramMediaFromGraph);

describe("admin instagram sync route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    syncInstagramMediaFromGraphMock.mockResolvedValue({
      ok: true,
      summary: {
        imported: 1,
        updated: 2,
        skipped: 0,
        errors: [],
        missing: [],
        endpoint: "/{ig-user-id}/media",
      },
    });
  });

  it("requires admin auth before returning sync status", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: false,
      admin: false,
      profile: null,
    });

    const response = await POST(
      new Request("http://localhost/api/admin/instagram-media/sync", { method: "POST" }),
    );

    expect(response.status).toBe(401);
  });

  it("returns a clear disabled response without credentials", async () => {
    syncInstagramMediaFromGraphMock.mockResolvedValue({
      ok: false,
      status: 501,
      summary: {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: ["Faltan credenciales oficiales server-only para sincronizar Instagram."],
        missing: ["INSTAGRAM_ACCESS_TOKEN"],
        endpoint: "/{ig-user-id}/media",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/instagram-media/sync", { method: "POST" }),
    );
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.errors[0]).toContain("Faltan credenciales");
    expect(body.endpoint).toBe("/{ig-user-id}/media");
    expect(body.missing).toContain("INSTAGRAM_ACCESS_TOKEN");
  });

  it("syncs through the official helper when admin and Firestore are available", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/instagram-media/sync", { method: "POST" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain("API oficial de Meta");
    expect(body.imported).toBe(1);
    expect(body.updated).toBe(2);
    expect(syncInstagramMediaFromGraphMock).toHaveBeenCalledWith(expect.anything());
  });

  it("rejects non-admin users before syncing", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/instagram-media/sync", { method: "POST" }),
    );

    expect(response.status).toBe(403);
    expect(syncInstagramMediaFromGraphMock).not.toHaveBeenCalled();
  });
});
