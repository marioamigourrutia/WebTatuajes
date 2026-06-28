import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { listAdminReviews } from "@/lib/reviews/review";

vi.mock("@/lib/auth/bearer", () => ({ getBearerToken: vi.fn(() => "id-token") }));
vi.mock("@/lib/auth/server", () => ({ getServerAuthStatusFromIdToken: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({ getFirebaseAdminFirestore: vi.fn() }));
vi.mock("@/lib/reviews/review", () => ({ listAdminReviews: vi.fn() }));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const listAdminReviewsMock = vi.mocked(listAdminReviews);

describe("admin reviews list route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    listAdminReviewsMock.mockResolvedValue([]);
  });

  it("requires admin auth before listing reviews", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await GET(new Request("http://localhost/api/admin/reviews"));

    expect(response.status).toBe(403);
    expect(listAdminReviewsMock).not.toHaveBeenCalled();
  });

  it("lists reviews for admins", async () => {
    const response = await GET(new Request("http://localhost/api/admin/reviews"));

    expect(response.status).toBe(200);
    expect(listAdminReviewsMock).toHaveBeenCalledWith(expect.anything());
  });
});
