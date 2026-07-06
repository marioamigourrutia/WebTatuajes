import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH, POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  createManualInstagramMedia,
  listAdminInstagramMedia,
  updateInstagramMediaFlags,
} from "@/lib/instagram/instagram-media";

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
  createManualInstagramMedia: vi.fn(),
  listAdminInstagramMedia: vi.fn(),
  updateInstagramMediaFlags: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const createManualInstagramMediaMock = vi.mocked(createManualInstagramMedia);
const listAdminInstagramMediaMock = vi.mocked(listAdminInstagramMedia);
const updateInstagramMediaFlagsMock = vi.mocked(updateInstagramMediaFlags);

describe("admin instagram media route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    createManualInstagramMediaMock.mockResolvedValue({ ok: true, id: "media-123" });
    listAdminInstagramMediaMock.mockResolvedValue([]);
    updateInstagramMediaFlagsMock.mockResolvedValue({ ok: true, itemId: "media-123" });
  });

  it("requires admin auth before listing media", async () => {
    const response = await GET(new Request("http://localhost/api/admin/instagram-media"));

    expect(response.status).toBe(200);
    expect(getServerAuthStatusFromIdTokenMock).toHaveBeenCalledWith("id-token");
    expect(listAdminInstagramMediaMock).toHaveBeenCalledTimes(1);
  });

  it("rejects non-admin users before creating manual media", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/instagram-media", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(403);
    expect(createManualInstagramMediaMock).not.toHaveBeenCalled();
  });

  it("creates manual media through the helper", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/instagram-media", {
        method: "POST",
        body: JSON.stringify({
          mediaType: "IMAGE",
          caption: "Flor",
          mediaUrl: "https://cdn.example.test/flor.webp",
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({ id: "media-123" });
    expect(response.status).toBe(201);
    expect(createManualInstagramMediaMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.anything(),
    );
  });

  it("updates visibility flags through the helper", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/admin/instagram-media", {
        method: "PATCH",
        body: JSON.stringify({ itemId: "media-123", hidden: true }),
      }),
    );

    await expect(response.json()).resolves.toEqual({ itemId: "media-123" });
    expect(updateInstagramMediaFlagsMock).toHaveBeenCalledWith(expect.anything(), "media-123", {
      itemId: "media-123",
      hidden: true,
    });
  });
});
