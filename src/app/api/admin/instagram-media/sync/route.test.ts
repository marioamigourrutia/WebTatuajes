import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";

vi.mock("@/lib/auth/bearer", () => ({
  getBearerToken: vi.fn(() => "id-token"),
}));

vi.mock("@/lib/auth/server", () => ({
  getServerAuthStatusFromIdToken: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);

describe("admin instagram sync route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
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
    const response = await POST(
      new Request("http://localhost/api/admin/instagram-media/sync", { method: "POST" }),
    );
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.message).toContain("Sincronización de Instagram deshabilitada");
    expect(body.endpoint).toBe("/{ig-user-id}/media");
    expect(body.missing).toContain("INSTAGRAM_ACCESS_TOKEN");
  });

  it("still does not fake sync success when credentials exist", async () => {
    vi.stubEnv("INSTAGRAM_IG_USER_ID", "1789");
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "token");
    vi.stubEnv("INSTAGRAM_APP_ID", "app");
    vi.stubEnv("INSTAGRAM_APP_SECRET", "secret");

    const response = await POST(
      new Request("http://localhost/api/admin/instagram-media/sync", { method: "POST" }),
    );
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.message).toContain("pendiente de implementación");
  });
});
