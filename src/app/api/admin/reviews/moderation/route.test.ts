import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { updateReviewModerationStatus } from "@/lib/reviews/review";

vi.mock("@/lib/auth/bearer", () => ({ getBearerToken: vi.fn(() => "id-token") }));
vi.mock("@/lib/auth/server", () => ({ getServerAuthStatusFromIdToken: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({ getFirebaseAdminFirestore: vi.fn() }));
vi.mock("@/lib/reviews/review", () => ({ updateReviewModerationStatus: vi.fn() }));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const updateReviewModerationStatusMock = vi.mocked(updateReviewModerationStatus);

function request(body: unknown) {
  return new Request("http://localhost/api/admin/reviews/moderation", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("admin review moderation route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    updateReviewModerationStatusMock.mockResolvedValue({
      ok: true,
      reviewId: "review-1",
      moderationStatus: "published",
    });
  });

  it("requires admin auth before moderating", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(
      request({ reviewId: "review-1", moderationStatus: "published", rating: 1, comment: "hack" }),
    );

    expect(response.status).toBe(403);
    expect(updateReviewModerationStatusMock).not.toHaveBeenCalled();
  });

  it("passes only review id and moderation status to the helper", async () => {
    const response = await POST(
      request({ reviewId: "review-1", moderationStatus: "published", rating: 1, comment: "hack" }),
    );

    expect(response.status).toBe(200);
    expect(updateReviewModerationStatusMock).toHaveBeenCalledWith(
      expect.anything(),
      "review-1",
      "published",
    );
  });
});
