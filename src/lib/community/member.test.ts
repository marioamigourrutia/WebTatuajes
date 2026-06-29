import { describe, expect, it, vi } from "vitest";
import {
  buildCommunityMembersCsv,
  createCommunityMember,
  getCommunityMemberDocumentId,
  listRecentCommunityMembers,
  mapCommunityMemberToFirestore,
  unsubscribeCommunityMember,
  validateCommunityMemberInput,
  validateCommunityMemberUnsubscribeInput,
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

function mockCommunityMembersCollectionWithUpdate(update = vi.fn().mockResolvedValue(undefined)) {
  return {
    doc: vi.fn(() => ({ update })),
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
        unsubscribed_at: null,
      });
    }
  });
});

describe("community member unsubscribe", () => {
  it("requires a valid email and explicit confirmation", () => {
    expect(
      validateCommunityMemberUnsubscribeInput({ email: " ANA@EXAMPLE.TEST ", confirmation: "on" }),
    ).toEqual({ ok: true, value: { email: "ana@example.test", confirmation: true } });

    const result = validateCommunityMemberUnsubscribeInput({ email: "not-an-email" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        email: expect.any(String),
        confirmation: expect.any(String),
      });
    }
  });

  it("marks an existing deterministic member inactive without deleting it", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const communityMembers = mockCommunityMembersCollectionWithUpdate(update);
    const firestore = { collection: vi.fn(() => communityMembers) };

    const result = await unsubscribeCommunityMember(
      { email: "ANA@EXAMPLE.TEST", confirmation: true },
      firestore as never,
    );

    expect(result).toEqual({ ok: true });
    expect(communityMembers.doc).toHaveBeenCalledWith(
      getCommunityMemberDocumentId("ana@example.test"),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ active: false, unsubscribed_at: expect.anything() }),
    );
  });

  it("returns generic ok when the deterministic member does not exist", async () => {
    const update = vi.fn().mockRejectedValue({ code: "not-found" });
    const communityMembers = mockCommunityMembersCollectionWithUpdate(update);
    const firestore = { collection: vi.fn(() => communityMembers) };

    await expect(
      unsubscribeCommunityMember(
        { email: "missing@example.test", confirmation: true },
        firestore as never,
      ),
    ).resolves.toEqual({ ok: true });
  });

  it("returns an internal failure when Firestore unsubscribe update fails operationally", async () => {
    const update = vi.fn().mockRejectedValue({ code: "permission-denied" });
    const communityMembers = mockCommunityMembersCollectionWithUpdate(update);
    const firestore = { collection: vi.fn(() => communityMembers) };

    await expect(
      unsubscribeCommunityMember(
        { email: "ana@example.test", confirmation: true },
        firestore as never,
      ),
    ).resolves.toEqual({
      ok: false,
      status: 500,
      errors: { form: "No pudimos procesar la baja. Intenta nuevamente." },
    });
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
                    unsubscribed_at: new Date("2026-01-02T03:04:05.000Z"),
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
        unsubscribedAt: "2026-01-02T03:04:05.000Z",
      }),
    ]);
  });
});

describe("community member CSV export", () => {
  it("escapes CSV cells and excludes document ids/internal fields", () => {
    const csv = buildCommunityMembersCsv([
      {
        id: "email_sha256_secret",
        fullName: 'Ana "Comunidad", Test',
        email: "ana@example.test",
        active: false,
        origin: "homepage_community_form",
        sourcePath: "/",
        createdAt: "2026-01-01T00:00:00.000Z",
        consentRecordedAt: null,
        unsubscribedAt: "2026-01-02T00:00:00.000Z",
      },
    ]);

    expect(csv).toContain('"Ana ""Comunidad"", Test",ana@example.test,Inactivo');
    expect(csv).not.toContain("email_sha256_secret");
  });

  it("neutralizes spreadsheet formulas in user-controlled CSV fields", () => {
    const csv = buildCommunityMembersCsv([
      {
        id: "member-1",
        fullName: '=IMPORTXML("https://example.test")',
        email: "+ana@example.test",
        active: true,
        origin: "  @external-origin",
        sourcePath: "\t/campaign",
        createdAt: "2026-01-01T00:00:00.000Z",
        consentRecordedAt: "2026-01-01T00:00:00.000Z",
        unsubscribedAt: '\r=HYPERLINK("https://example.test")',
      },
    ]);

    expect(csv).toContain('"\'=IMPORTXML(""https://example.test"")"');
    expect(csv).toContain("'+ana@example.test");
    expect(csv).toContain("'  @external-origin");
    expect(csv).toContain("'\t/campaign");
    expect(csv).toContain('"\'\r=HYPERLINK(""https://example.test"")"');
  });
});
