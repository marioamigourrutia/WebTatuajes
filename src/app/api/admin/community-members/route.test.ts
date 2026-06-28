import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { listRecentCommunityMembers } from "@/lib/community/member";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

vi.mock("@/lib/auth/bearer", () => ({
  getBearerToken: vi.fn(() => "id-token"),
}));

vi.mock("@/lib/auth/server", () => ({
  getServerAuthStatusFromIdToken: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminFirestore: vi.fn(),
}));

vi.mock("@/lib/community/member", () => ({
  listRecentCommunityMembers: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getBearerTokenMock = vi.mocked(getBearerToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const listRecentCommunityMembersMock = vi.mocked(listRecentCommunityMembers);

describe("admin community members route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getBearerTokenMock.mockReturnValue("id-token");
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    listRecentCommunityMembersMock.mockResolvedValue([
      {
        id: "member-1",
        fullName: "Ana Comunidad",
        email: "ana@example.test",
        active: true,
        origin: "homepage_community_form",
        sourcePath: "/",
        createdAt: null,
        consentRecordedAt: null,
      },
    ]);
  });

  it("returns 401 when the request is unauthenticated", async () => {
    getBearerTokenMock.mockReturnValue(undefined);
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: false,
      admin: false,
      profile: null,
    });

    const response = await POST(
      new Request("http://localhost/api/admin/community-members", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    expect(listRecentCommunityMembersMock).not.toHaveBeenCalled();
  });

  it("requires server-side admin validation before listing community members", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/community-members", { method: "POST" }),
    );

    await expect(response.json()).resolves.toEqual({
      communityMembers: [expect.objectContaining({ email: "ana@example.test" })],
    });
    expect(response.status).toBe(200);
    expect(getServerAuthStatusFromIdTokenMock).toHaveBeenCalledWith("id-token");
    expect(listRecentCommunityMembersMock).toHaveBeenCalledWith(expect.anything());
  });

  it("rejects non-admin users", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/community-members", { method: "POST" }),
    );

    expect(response.status).toBe(403);
    expect(listRecentCommunityMembersMock).not.toHaveBeenCalled();
  });

  it("returns 503 when Firebase Admin is unavailable", async () => {
    getFirebaseAdminFirestoreMock.mockReturnValue(null);

    const response = await POST(
      new Request("http://localhost/api/admin/community-members", { method: "POST" }),
    );

    expect(response.status).toBe(503);
  });
});
