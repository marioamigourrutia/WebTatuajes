import { describe, expect, it, vi } from "vitest";
import {
  createCommunityMember,
  getCommunityMemberDocumentId,
  listRecentCommunityMembers,
  mapCommunityMemberToFirestore,
  validateCommunityMemberInput,
} from "./member";

const validInput = {
  fullName: "  Ana   Comunidad  ",
  email: " ANA@EXAMPLE.TEST ",
  marketingConsent: "on",
  active: false,
  origin: "client-controlled-origin",
};

function mockCommunityMembersCollection(set = vi.fn().mockResolvedValue(undefined)) {
  return {
    doc: vi.fn(() => ({ set })),
  };
}

describe("community member validation", () => {
  it("sanitizes and accepts a community member with explicit consent", () => {
    const result = validateCommunityMemberInput(validInput);

    expect(result).toEqual({
      ok: true,
      value: {
        fullName: "Ana Comunidad",
        email: "ana@example.test",
        marketingConsent: true,
      },
    });
  });

  it("rejects missing fields, invalid email, long values, and missing consent", () => {
    const result = validateCommunityMemberInput({
      fullName: " ",
      email: "not-an-email",
      marketingConsent: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        fullName: expect.any(String),
        email: expect.any(String),
        marketingConsent: expect.any(String),
      });
    }

    const tooLong = validateCommunityMemberInput({
      fullName: "A".repeat(81),
      email: `${"a".repeat(151)}@example.test`,
      marketingConsent: true,
    });

    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) {
      expect(tooLong.errors).toMatchObject({
        fullName: expect.any(String),
        email: expect.any(String),
      });
    }
  });

  it("maps only server-owned community fields to Firestore", () => {
    const validation = validateCommunityMemberInput(validInput);

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(mapCommunityMemberToFirestore(validation.value)).toMatchObject({
        full_name: "Ana Comunidad",
        email: "ana@example.test",
        marketing_consent: true,
        origin: "homepage_community_form",
        source_path: "/",
        active: true,
      });
    }
  });
});

describe("community member persistence", () => {
  it("creates a Firestore community member and ignores client-controlled status fields", async () => {
    const set = vi.fn().mockResolvedValue(undefined);
    const communityMembers = mockCommunityMembersCollection(set);
    const firestore = {
      collection: vi.fn((name: string) => {
        if (name === "community_members") return communityMembers;
        throw new Error(`Unexpected collection ${name}`);
      }),
    };

    const result = await createCommunityMember(validInput, firestore as never);

    expect(result).toEqual({ ok: true });
    expect(communityMembers.doc).toHaveBeenCalledWith(
      getCommunityMemberDocumentId("ana@example.test"),
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: "Ana Comunidad",
        email: "ana@example.test",
        active: true,
        origin: "homepage_community_form",
      }),
      { merge: true },
    );
  });

  it("uses a deterministic hashed document id so duplicate email writes target the same member", async () => {
    const set = vi.fn().mockResolvedValue(undefined);
    const communityMembers = mockCommunityMembersCollection(set);
    const firestore = { collection: vi.fn(() => communityMembers) };

    const firstResult = await createCommunityMember(validInput, firestore as never);
    const secondResult = await createCommunityMember(
      { ...validInput, email: "ana@example.test" },
      firestore as never,
    );

    expect(firstResult).toEqual({ ok: true });
    expect(secondResult).toEqual({ ok: true });
    expect(communityMembers.doc).toHaveBeenCalledTimes(2);
    expect(communityMembers.doc).toHaveBeenNthCalledWith(
      1,
      getCommunityMemberDocumentId("ana@example.test"),
    );
    expect(communityMembers.doc).toHaveBeenNthCalledWith(
      2,
      getCommunityMemberDocumentId("ana@example.test"),
    );
    expect(set).toHaveBeenCalledTimes(2);
  });

  it("returns a clear backend error when Firebase Admin is unavailable", async () => {
    const result = await createCommunityMember(validInput, null);

    expect(result).toEqual({
      ok: false,
      status: 503,
      errors: { form: "Firebase Admin no está configurado para guardar la inscripción." },
    });
  });

  it("serializes recent community members for the admin panel", async () => {
    const firestore = {
      collection: vi.fn(() => ({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              docs: [
                {
                  id: "member-1",
                  data: () => ({
                    full_name: "Ana Comunidad",
                    email: "ANA@EXAMPLE.TEST",
                    active: true,
                    origin: "homepage_community_form",
                    source_path: "/",
                  }),
                },
              ],
            }),
          }),
        }),
      })),
    };

    await expect(listRecentCommunityMembers(firestore as never)).resolves.toEqual([
      expect.objectContaining({
        id: "member-1",
        fullName: "Ana Comunidad",
        email: "ana@example.test",
        active: true,
        origin: "homepage_community_form",
      }),
    ]);
  });
});
