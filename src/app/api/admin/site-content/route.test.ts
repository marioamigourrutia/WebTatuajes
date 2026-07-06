import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH, PUT } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { defaultSiteContent, getSiteContent, saveSiteContent } from "@/lib/cms/site-content";

vi.mock("@/lib/auth/bearer", () => ({ getBearerToken: vi.fn(() => "id-token") }));
vi.mock("@/lib/auth/server", () => ({ getServerAuthStatusFromIdToken: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({ getFirebaseAdminFirestore: vi.fn() }));
vi.mock("@/lib/cms/site-content", () => ({
  defaultSiteContent: {
    siteSettings: { studioName: "Studio" },
    home: { heroTitle: "Hero" },
  },
  getSiteContent: vi.fn(),
  saveSiteContent: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const getSiteContentMock = vi.mocked(getSiteContent);
const saveSiteContentMock = vi.mocked(saveSiteContent);

describe("admin site content route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ doc: vi.fn() } as never);
    getSiteContentMock.mockResolvedValue(defaultSiteContent as never);
    saveSiteContentMock.mockResolvedValue({ ok: true, content: defaultSiteContent } as never);
  });

  it("returns CMS content only after server-side admin validation", async () => {
    const response = await GET(new Request("http://localhost/api/admin/site-content"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ content: defaultSiteContent });
    expect(getServerAuthStatusFromIdTokenMock).toHaveBeenCalledWith("id-token");
    expect(getSiteContentMock).toHaveBeenCalledWith(expect.anything());
  });

  it("rejects unauthenticated requests before touching Firestore", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: false,
      admin: false,
      profile: null,
    });

    const response = await PATCH(
      new Request("http://localhost/api/admin/site-content", { method: "PATCH", body: "{}" }),
    );

    expect(response.status).toBe(401);
    expect(getFirebaseAdminFirestoreMock).not.toHaveBeenCalled();
    expect(saveSiteContentMock).not.toHaveBeenCalled();
  });

  it("rejects non-admin requests", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await GET(new Request("http://localhost/api/admin/site-content"));

    expect(response.status).toBe(403);
    expect(getSiteContentMock).not.toHaveBeenCalled();
  });

  it("returns update validation errors", async () => {
    saveSiteContentMock.mockResolvedValue({
      ok: false,
      status: 400,
      errors: { whatsappPhone: "Ingresa un teléfono de WhatsApp válido." },
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/admin/site-content", {
        method: "PATCH",
        body: JSON.stringify({ siteSettings: { whatsappPhone: "abc" } }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errors: { whatsappPhone: "Ingresa un teléfono de WhatsApp válido." },
    });
  });

  it("supports PUT as the same safe update operation", async () => {
    const response = await PUT(
      new Request("http://localhost/api/admin/site-content", {
        method: "PUT",
        body: JSON.stringify(defaultSiteContent),
      }),
    );

    expect(response.status).toBe(200);
    expect(saveSiteContentMock).toHaveBeenCalledWith(expect.anything(), defaultSiteContent);
  });
});
