import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  defaultHomePageContent,
  defaultSiteContent,
  getSiteContent,
  interpolateSiteText,
  mapHomePageContentToFirestore,
  mapSiteSettingsToFirestore,
  normalizeHomePageContent,
  normalizeSiteSettings,
  saveSiteContent,
  validateSiteContentInput,
} from "./site-content";

vi.mock("@/lib/config/firebase-admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/config/firebase-admin")>();

  return {
    ...actual,
    isFirebaseAdminBackendConfigured: vi.fn(() => true),
  };
});

vi.mock("@/lib/firebase/admin", () => ({ getFirebaseAdminFirestore: vi.fn() }));

const { isFirebaseAdminBackendConfigured } = vi.mocked(await import("@/lib/config/firebase-admin"));

describe("CMS site content helpers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    isFirebaseAdminBackendConfigured.mockReturnValue(true);
  });

  it("normalizes missing or invalid CMS data back to safe defaults", () => {
    expect(
      normalizeSiteSettings({ studio_name: "  Estudio Norte  ", instagram_url: "http://bad" }),
    ).toMatchObject({
      studioName: "Estudio Norte",
      instagramUrl: defaultSiteContent.siteSettings.instagramUrl,
    });

    expect(
      normalizeHomePageContent({
        hero_title: "  Nuevo título  ",
        primary_cta_href: "javascript:alert(1)",
        process_card_items: [{ term: "", description: "" }],
      }),
    ).toMatchObject({
      heroTitle: "Nuevo título",
      primaryCtaHref: defaultHomePageContent.primaryCtaHref,
      processCardItems: defaultHomePageContent.processCardItems,
    });
  });

  it("preserves editable homepage visibility flags", () => {
    const normalized = normalizeHomePageContent({
      sections: {
        reviews: false,
        sponsors: false,
        process: false,
        community: false,
        contact: false,
        finalCta: false,
      },
    });

    expect(normalized.sections).toMatchObject({
      reviews: false,
      sponsors: false,
      process: false,
      community: false,
      contact: false,
      finalCta: false,
    });
    expect(mapHomePageContentToFirestore(normalized)).toMatchObject({
      sections: expect.objectContaining({
        reviews: false,
        sponsors: false,
        process: false,
        community: false,
        contact: false,
        finalCta: false,
      }),
    });
  });

  it("maps camelCase app content to snake_case Firestore documents", () => {
    expect(mapSiteSettingsToFirestore(defaultSiteContent.siteSettings)).toMatchObject({
      studio_name: defaultSiteContent.siteSettings.studioName,
      whatsapp_phone: defaultSiteContent.siteSettings.whatsappPhone,
    });
    expect(mapHomePageContentToFirestore(defaultSiteContent.home)).toMatchObject({
      hero_title: defaultSiteContent.home.heroTitle,
      process_card_items: defaultSiteContent.home.processCardItems,
    });
  });

  it("reads CMS docs server-side and merges with defaults", async () => {
    const doc = vi.fn((path: string) => ({
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () =>
          path === "site_settings/main"
            ? { studio_name: "Ink Austral", artist_name: "Mario" }
            : { hero_title: "Agenda con criterio" },
      }),
    }));

    await expect(getSiteContent({ doc } as never)).resolves.toMatchObject({
      siteSettings: { studioName: "Ink Austral", artistName: "Mario" },
      home: { heroTitle: "Agenda con criterio" },
    });
  });

  it("falls back without touching Firebase when Admin backend is unconfigured", async () => {
    isFirebaseAdminBackendConfigured.mockReturnValue(false);

    await expect(getSiteContent()).resolves.toEqual(defaultSiteContent);
    expect(getFirebaseAdminFirestore).not.toHaveBeenCalled();
  });

  it("validates admin updates before writing", async () => {
    const result = validateSiteContentInput({
      siteSettings: { ...defaultSiteContent.siteSettings, whatsappPhone: "abc" },
      home: defaultSiteContent.home,
    });

    expect(result).toMatchObject({ ok: false, errors: { whatsappPhone: expect.any(String) } });
  });

  it("saves valid content in both CMS documents", async () => {
    const set = vi.fn();
    const commit = vi.fn();
    const firestore = {
      doc: vi.fn((path: string) => ({ path })),
      batch: vi.fn(() => ({ set, commit })),
    };

    await expect(saveSiteContent(firestore as never, defaultSiteContent)).resolves.toMatchObject({
      ok: true,
    });
    expect(set).toHaveBeenCalledTimes(2);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("writes disabled visibility flags to the home document", async () => {
    const set = vi.fn();
    const commit = vi.fn();
    const firestore = {
      doc: vi.fn((path: string) => ({ path })),
      batch: vi.fn(() => ({ set, commit })),
    };
    const hiddenReviewsContent = {
      ...defaultSiteContent,
      home: {
        ...defaultSiteContent.home,
        sections: { ...defaultSiteContent.home.sections, reviews: false, community: false },
      },
    };

    await saveSiteContent(firestore as never, hiddenReviewsContent);

    expect(set).toHaveBeenCalledTimes(2);
    expect(set.mock.calls[1]?.[1]).toMatchObject({
      sections: expect.objectContaining({ reviews: false, community: false }),
    });
  });

  it("interpolates site settings placeholders in public copy", () => {
    expect(
      interpolateSiteText("Hola {studioName} / {artistName}", defaultSiteContent.siteSettings),
    ).toContain(defaultSiteContent.siteSettings.studioName);
  });
});
