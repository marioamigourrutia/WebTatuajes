import { describe, expect, it, vi } from "vitest";
import {
  createReviewToken,
  hashReviewToken,
  listPublishedReviews,
  submitReviewWithToken,
  updateReviewModerationStatus,
  validateReviewSubmissionInput,
} from "./review";

function document(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

describe("review validation", () => {
  it("validates token, rating, comment, public name and publish consent", () => {
    const invalid = validateReviewSubmissionInput({
      token: "",
      rating: 6,
      comment: "",
      publicName: "",
      publishConsent: false,
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok)
      expect(Object.keys(invalid.errors)).toEqual([
        "token",
        "rating",
        "comment",
        "publicName",
        "publishConsent",
      ]);

    expect(
      validateReviewSubmissionInput({
        token: "abc",
        rating: 5,
        comment: "Excelente",
        publicName: "MA",
        publishConsent: true,
      }).ok,
    ).toBe(true);
  });
});

describe("review tokens", () => {
  it("stores only the token hash when admin creates a link", async () => {
    const set = vi.fn();
    const firestore = { collection: vi.fn(() => ({ doc: vi.fn(() => ({ set })) })) } as never;

    const result = await createReviewToken(
      firestore,
      { customerEmail: "client@example.test" },
      "https://studio.test",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.link).toContain("/opiniones/enviar?token=");
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ token_hash: result.tokenHash, status: "unused" }),
      );
      expect(JSON.stringify(set.mock.calls[0]?.[0])).not.toContain(result.token);
    }
  });

  it("creates one pending review and marks the token used in one transaction", async () => {
    const rawToken = "private-token";
    const update = vi.fn();
    const set = vi.fn();
    const tokenDoc = {
      exists: true,
      data: () => ({
        status: "unused",
        quote_id: "quote-1",
        customer_email: "client@example.test",
      }),
    };
    const tokenRef = { id: hashReviewToken(rawToken) };
    const reviewRef = { id: "review-1" };
    const firestore = {
      collection: vi.fn((name: string) => ({
        doc: vi.fn((id?: string) =>
          name === "review_tokens" ? tokenRef : { ...reviewRef, id: id ?? reviewRef.id },
        ),
      })),
      runTransaction: vi.fn((callback) => callback({ get: vi.fn(() => tokenDoc), set, update })),
    } as never;

    const result = await submitReviewWithToken(firestore, {
      token: rawToken,
      rating: 5,
      comment: "Gran experiencia",
      publicName: "Cliente",
      publishConsent: true,
    });

    expect(result).toEqual({ ok: true, id: "review-1" });
    expect(set).toHaveBeenCalledWith(
      reviewRef,
      expect.objectContaining({
        rating: 5,
        comment: "Gran experiencia",
        moderation_status: "pending",
        review_token_hash: hashReviewToken(rawToken),
      }),
    );
    expect(update).toHaveBeenCalledWith(tokenRef, expect.objectContaining({ status: "used" }));
  });

  it("rejects an already used token", async () => {
    const firestore = {
      collection: vi.fn(() => ({ doc: vi.fn(() => ({})) })),
      runTransaction: vi.fn((callback) =>
        callback({ get: vi.fn(() => ({ exists: true, data: () => ({ status: "used" }) })) }),
      ),
    } as never;

    await expect(
      submitReviewWithToken(firestore, {
        token: "private-token",
        rating: 5,
        comment: "Ok",
        publicName: "C",
        publishConsent: true,
      }),
    ).resolves.toMatchObject({ ok: false, status: 409 });
  });
});

describe("review listing and moderation", () => {
  it("queries only published reviews with publish consent", async () => {
    const get = vi.fn(() => ({
      docs: [
        document("review-1", {
          rating: 5,
          comment: "Ok",
          public_name: "C",
          moderation_status: "published",
          publish_consent: true,
        }),
      ],
    }));
    const limit = vi.fn(() => ({ get }));
    const orderBy = vi.fn(() => ({ limit }));
    const where = vi.fn(() => ({ where, orderBy }));
    const firestore = { collection: vi.fn(() => ({ where })) } as never;

    await expect(listPublishedReviews(firestore)).resolves.toEqual([
      { id: "review-1", rating: 5, comment: "Ok", publicName: "C", createdAt: null },
    ]);
    expect(where).toHaveBeenCalledWith("moderation_status", "==", "published");
    expect(where).toHaveBeenCalledWith("publish_consent", "==", true);
  });

  it("moderation only updates moderation status and timestamp", async () => {
    const update = vi.fn();
    const get = vi.fn(() => ({ exists: true }));
    const firestore = {
      collection: vi.fn(() => ({ doc: vi.fn(() => ({ get, update })) })),
    } as never;

    const result = await updateReviewModerationStatus(firestore, "review-1", "published");

    expect(result).toMatchObject({ ok: true, reviewId: "review-1", moderationStatus: "published" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ moderation_status: "published", updated_at: expect.anything() }),
    );
    expect(update.mock.calls[0]?.[0]).not.toHaveProperty("rating");
    expect(update.mock.calls[0]?.[0]).not.toHaveProperty("comment");
  });
});
