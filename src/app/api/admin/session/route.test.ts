import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "./route";
import { createAdminSessionCookieFromIdToken } from "@/lib/auth/server";

vi.mock("@/lib/auth/bearer", () => ({
  getBearerToken: vi.fn(() => "id-token"),
}));

vi.mock("@/lib/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/server")>();

  return {
    ...actual,
    createAdminSessionCookieFromIdToken: vi.fn(),
  };
});

const createAdminSessionCookieFromIdTokenMock = vi.mocked(createAdminSessionCookieFromIdToken);

describe("admin session route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createAdminSessionCookieFromIdTokenMock.mockResolvedValue({
      ok: true,
      sessionCookie: "session-cookie",
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
  });

  it("sets an httpOnly admin session cookie after server-side admin validation", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/session", { method: "POST" }),
    );

    await expect(response.json()).resolves.toMatchObject({ authenticated: true, admin: true });
    expect(response.status).toBe(200);
    expect(createAdminSessionCookieFromIdTokenMock).toHaveBeenCalledWith("id-token");
    expect(response.headers.get("set-cookie")).toContain(
      "webtatuajes_admin_session=session-cookie",
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
  });

  it("rejects non-admin users without setting a session cookie", async () => {
    createAdminSessionCookieFromIdTokenMock.mockResolvedValue({ ok: false, status: 403 });

    const response = await POST(
      new Request("http://localhost/api/admin/session", { method: "POST" }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects unauthenticated requests", async () => {
    createAdminSessionCookieFromIdTokenMock.mockResolvedValue({ ok: false, status: 401 });

    const response = await POST(
      new Request("http://localhost/api/admin/session", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("clears the admin session cookie", async () => {
    const response = await DELETE();

    await expect(response.json()).resolves.toEqual({
      authenticated: false,
      admin: false,
      profile: null,
    });
    expect(response.headers.get("set-cookie")).toContain("webtatuajes_admin_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
