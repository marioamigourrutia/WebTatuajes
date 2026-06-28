import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { listPublishedReviews, submitReviewWithToken } from "@/lib/reviews/review";

vi.mock("@/lib/firebase/admin", () => ({ getFirebaseAdminFirestore: vi.fn() }));
vi.mock("@/lib/reviews/review", () => ({
  listPublishedReviews: vi.fn(),
  submitReviewWithToken: vi.fn(),
}));

const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const listPublishedReviewsMock = vi.mocked(listPublishedReviews);
const submitReviewWithTokenMock = vi.mocked(submitReviewWithToken);

describe("public reviews route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    listPublishedReviewsMock.mockResolvedValue([
      { id: "review-1", rating: 5, comment: "Excelente", publicName: "MA", createdAt: null },
    ]);
    submitReviewWithTokenMock.mockResolvedValue({ ok: true, id: "review-1" });
  });

  it("lists only the safe published review payload from the helper", async () => {
    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      reviews: [
        { id: "review-1", rating: 5, comment: "Excelente", publicName: "MA", createdAt: null },
      ],
    });
    expect(listPublishedReviewsMock).toHaveBeenCalledWith(expect.anything());
  });

  it("submits reviews through server-side one-time token validation", async () => {
    const body = {
      token: "private-token",
      rating: 5,
      comment: "Excelente",
      publicName: "MA",
      publishConsent: true,
    };
    const response = await POST(
      new Request("http://localhost/api/reviews", { method: "POST", body: JSON.stringify(body) }),
    );

    expect(response.status).toBe(201);
    expect(submitReviewWithTokenMock).toHaveBeenCalledWith(expect.anything(), body);
  });
});
