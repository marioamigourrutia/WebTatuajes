import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page";
import { defaultSiteContent } from "@/lib/cms/site-content";

vi.mock("@/lib/firebase/admin", () => ({ getFirebaseAdminFirestore: vi.fn(() => null) }));
vi.mock("@/lib/portfolio/public-portfolio-backend", () => ({
  canUsePublicBackend: vi.fn(() => Promise.resolve(false)),
}));
vi.mock("@/lib/instagram/instagram-media", () => ({ listPublicInstagramMedia: vi.fn() }));
vi.mock("@/lib/instagram/portfolio-adapter", () => ({
  instagramMediaToPortfolioItems: vi.fn(() => []),
}));
vi.mock("@/lib/reviews/review", () => ({ listPublishedReviews: vi.fn(() => Promise.resolve([])) }));
vi.mock("@/lib/sponsors/admin-sponsors", () => ({
  listPublicSponsors: vi.fn(() => Promise.resolve([])),
}));
vi.mock("@/lib/cms/site-content", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cms/site-content")>();

  return {
    ...actual,
    getSiteContent: vi.fn(() => Promise.resolve(actual.defaultSiteContent)),
  };
});

const { getSiteContent } = vi.mocked(await import("@/lib/cms/site-content"));
const { getFirebaseAdminFirestore } = vi.mocked(await import("@/lib/firebase/admin"));
const { listPublicSponsors } = vi.mocked(await import("@/lib/sponsors/admin-sponsors"));

const hiddenHomeSectionCases = [
  {
    section: "reviews",
    visibleText: "Opiniones",
    emptyFallbackText: "Aún no hay opiniones publicadas.",
  },
  { section: "portfolio", visibleText: "Portafolio", emptyFallbackText: null },
  { section: "shop", visibleText: "Obras disponibles", emptyFallbackText: null },
  { section: "finalCta", visibleText: "¿Tienes una idea para tatuarte?", emptyFallbackText: null },
  { section: "services", visibleText: "Estilos y servicios", emptyFallbackText: null },
  { section: "process", visibleText: "Proceso", emptyFallbackText: null },
  { section: "contact", visibleText: "Contacto", emptyFallbackText: null },
  { section: "community", visibleText: "Comunidad", emptyFallbackText: null },
] as const;

describe("home page CMS content", () => {
  it("renders current fallback content when CMS documents are unavailable", async () => {
    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Tatuajes con diseño, criterio y una experiencia segura.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/HuespedTattooStudio convierte ideas/)).toBeInTheDocument();
  });

  it("renders dynamic hero and process copy from CMS", async () => {
    getSiteContent.mockResolvedValueOnce({
      ...defaultSiteContent,
      siteSettings: { ...defaultSiteContent.siteSettings, studioName: "Ink Austral" },
      home: {
        ...defaultSiteContent.home,
        heroTitle: "Agenda tu tatuaje con criterio profesional",
        heroDescription: "{studioName} revisa cada proyecto antes de agendar.",
        processCardTitle: "Proceso editorial personalizado",
      },
    });

    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Agenda tu tatuaje con criterio profesional",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ink Austral revisa cada proyecto antes de agendar."),
    ).toBeInTheDocument();
    expect(screen.getByText("Proceso editorial personalizado")).toBeInTheDocument();
  });

  it.each(hiddenHomeSectionCases)(
    "hides the disabled CMS $section home section without rendering empty blocks",
    async ({ section, visibleText, emptyFallbackText }) => {
      getSiteContent.mockResolvedValueOnce({
        ...defaultSiteContent,
        home: {
          ...defaultSiteContent.home,
          sections: {
            ...defaultSiteContent.home.sections,
            [section]: false,
          },
        },
      });

      render(await HomePage());

      expect(screen.queryByText(visibleText)).not.toBeInTheDocument();
      if (emptyFallbackText) expect(screen.queryByText(emptyFallbackText)).not.toBeInTheDocument();
    },
  );

  it("hides the disabled CMS sponsors home section even when public sponsors exist", async () => {
    const firestore = {} as NonNullable<ReturnType<typeof getFirebaseAdminFirestore>>;

    getFirebaseAdminFirestore.mockReturnValueOnce(null).mockReturnValueOnce(firestore);
    listPublicSponsors.mockResolvedValueOnce([
      {
        id: "sponsor-1",
        name: "Needle Supply Co.",
        description: "Professional tattoo supplies.",
        category: "Insumos",
        logoUrl: null,
        websiteUrl: null,
        active: true,
        sortOrder: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    getSiteContent.mockResolvedValueOnce({
      ...defaultSiteContent,
      home: {
        ...defaultSiteContent.home,
        sections: {
          ...defaultSiteContent.home.sections,
          sponsors: false,
        },
      },
    });

    render(await HomePage());

    expect(screen.queryByText("Colaboradores")).not.toBeInTheDocument();
    expect(screen.queryByText("Needle Supply Co.")).not.toBeInTheDocument();
    expect(screen.queryByText("Ver colaboradores")).not.toBeInTheDocument();
  });

  it("hides several disabled CMS home sections together without rendering empty fallback blocks", async () => {
    getSiteContent.mockResolvedValueOnce({
      ...defaultSiteContent,
      home: {
        ...defaultSiteContent.home,
        sections: {
          ...defaultSiteContent.home.sections,
          reviews: false,
          portfolio: false,
          shop: false,
          sponsors: false,
          services: false,
          process: false,
          contact: false,
          community: false,
          finalCta: false,
        },
      },
    });

    render(await HomePage());

    expect(screen.queryByText("Opiniones")).not.toBeInTheDocument();
    expect(screen.queryByText("Aún no hay opiniones publicadas.")).not.toBeInTheDocument();
    expect(screen.queryByText("Portafolio")).not.toBeInTheDocument();
    expect(screen.queryByText("Una muestra visual antes de cotizar.")).not.toBeInTheDocument();
    expect(screen.queryByText("Obras disponibles")).not.toBeInTheDocument();
    expect(screen.queryByText("Colaboradores")).not.toBeInTheDocument();
    expect(screen.queryByText("Estilos y servicios")).not.toBeInTheDocument();
    expect(screen.queryByText("Proceso")).not.toBeInTheDocument();
    expect(screen.queryByText("Comunidad")).not.toBeInTheDocument();
    expect(screen.queryByText("Contacto")).not.toBeInTheDocument();
    expect(screen.queryByText("¿Tienes una idea para tatuarte?")).not.toBeInTheDocument();
  });
});
