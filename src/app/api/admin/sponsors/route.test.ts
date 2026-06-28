import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH, POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  createSponsor,
  deleteSponsor,
  listAdminSponsors,
  updateSponsor,
} from "@/lib/sponsors/admin-sponsors";

vi.mock("@/lib/auth/bearer", () => ({ getBearerToken: vi.fn(() => "id-token") }));
vi.mock("@/lib/auth/server", () => ({ getServerAuthStatusFromIdToken: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({ getFirebaseAdminFirestore: vi.fn() }));
vi.mock("@/lib/sponsors/admin-sponsors", () => ({
  createSponsor: vi.fn(),
  deleteSponsor: vi.fn(),
  listAdminSponsors: vi.fn(),
  updateSponsor: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const createSponsorMock = vi.mocked(createSponsor);
const deleteSponsorMock = vi.mocked(deleteSponsor);
const listAdminSponsorsMock = vi.mocked(listAdminSponsors);
const updateSponsorMock = vi.mocked(updateSponsor);

describe("admin sponsors route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    createSponsorMock.mockResolvedValue({ ok: true, id: "sponsor-123" });
    updateSponsorMock.mockResolvedValue({ ok: true, id: "sponsor-123" });
    deleteSponsorMock.mockResolvedValue({ ok: true, id: "sponsor-123" });
    listAdminSponsorsMock.mockResolvedValue([]);
  });

  it("revalidates admin role before creating a sponsor", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/sponsors", {
        method: "POST",
        body: JSON.stringify({ name: "Agujas Pro" }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: "sponsor-123" });
    expect(getServerAuthStatusFromIdTokenMock).toHaveBeenCalledWith("id-token");
    expect(createSponsorMock).toHaveBeenCalledWith({ name: "Agujas Pro" });
  });

  it("rejects non-admin users before mutating sponsors", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/sponsors", { method: "POST", body: "{}" }),
    );

    expect(response.status).toBe(403);
    expect(createSponsorMock).not.toHaveBeenCalled();
  });

  it.each([
    ["GET", GET, undefined, listAdminSponsorsMock],
    ["PATCH", PATCH, JSON.stringify({ sponsorId: "sponsor-123" }), updateSponsorMock],
    ["DELETE", DELETE, JSON.stringify({ sponsorId: "sponsor-123" }), deleteSponsorMock],
  ])(
    "returns 401 for unauthenticated %s sponsor requests",
    async (method, handler, body, helper) => {
      getServerAuthStatusFromIdTokenMock.mockResolvedValue({
        authenticated: false,
        admin: false,
        profile: null,
      });

      const response = await handler(
        new Request("http://localhost/api/admin/sponsors", { method, body }),
      );

      expect(response.status).toBe(401);
      expect(helper).not.toHaveBeenCalled();
      expect(getFirebaseAdminFirestoreMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["GET", GET, undefined, listAdminSponsorsMock],
    ["PATCH", PATCH, JSON.stringify({ sponsorId: "sponsor-123" }), updateSponsorMock],
    ["DELETE", DELETE, JSON.stringify({ sponsorId: "sponsor-123" }), deleteSponsorMock],
  ])("returns 403 for non-admin %s sponsor requests", async (method, handler, body, helper) => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await handler(
      new Request("http://localhost/api/admin/sponsors", { method, body }),
    );

    expect(response.status).toBe(403);
    expect(helper).not.toHaveBeenCalled();
    expect(getFirebaseAdminFirestoreMock).not.toHaveBeenCalled();
  });

  it("lists admin sponsors", async () => {
    listAdminSponsorsMock.mockResolvedValue([
      {
        id: "sponsor-123",
        name: "Agujas Pro",
        category: "Proveedor",
        description: "Insumos",
        websiteUrl: null,
        logoUrl: null,
        active: true,
        sortOrder: 0,
        createdAt: null,
        updatedAt: null,
      },
    ]);

    const response = await GET(new Request("http://localhost/api/admin/sponsors"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ sponsors: [{ id: "sponsor-123" }] });
  });

  it("updates sponsors through the helper", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/admin/sponsors", {
        method: "PATCH",
        body: JSON.stringify({ sponsorId: "sponsor-123", name: "Agujas Pro" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateSponsorMock).toHaveBeenCalledWith(
      expect.anything(),
      "sponsor-123",
      expect.anything(),
    );
  });

  it("deletes sponsors through the helper", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/admin/sponsors", {
        method: "DELETE",
        body: JSON.stringify({ sponsorId: "sponsor-123" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(deleteSponsorMock).toHaveBeenCalledWith(expect.anything(), "sponsor-123");
  });
});
