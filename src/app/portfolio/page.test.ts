import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { listPublicInstagramMedia, type InstagramMediaItem } from "@/lib/instagram/instagram-media";
import {
  getPublishedPortfolioItems,
  type FirestorePortfolioItem,
  type PublicPortfolioItem,
} from "@/lib/portfolio/portfolio";
import {
  canUsePublicBackend,
  listPublicBackendPortfolioItems,
} from "@/lib/portfolio/public-portfolio-backend";
import PortfolioPage, { dynamic } from "./page";

vi.mock("@/lib/portfolio/public-portfolio-backend", () => ({
  canUsePublicBackend: vi.fn(),
  listPublicBackendPortfolioItems: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminFirestore: vi.fn(() => null),
}));

vi.mock("@/lib/instagram/instagram-media", () => ({
  listPublicInstagramMedia: vi.fn(),
}));

const canUsePublicBackendMock = vi.mocked(canUsePublicBackend);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const listPublicInstagramMediaMock = vi.mocked(listPublicInstagramMedia);
const listPublicBackendPortfolioItemsMock = vi.mocked(listPublicBackendPortfolioItems);

describe("portfolio page rendering", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    canUsePublicBackendMock.mockResolvedValue(true);
  });

  it("forces dynamic rendering so admin-published items are read without rebuilding", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("falls back to the static public portfolio when backend loading fails", async () => {
    listPublicBackendPortfolioItemsMock.mockRejectedValueOnce(new Error("Metadata lookup failed"));

    const page = await PortfolioPage();
    const gallery = Array.isArray(page.props.children) ? page.props.children[1] : null;

    const items = gallery?.props.items as PublicPortfolioItem[] | undefined;

    expect(items).toEqual(getPublishedPortfolioItems());
    expect(items?.every((item) => item.published)).toBe(true);
  });

  it("passes only sanitized public portfolio props to the client gallery", async () => {
    listPublicBackendPortfolioItemsMock.mockResolvedValueOnce([
      {
        id: "admin-item-1",
        title: "Dragón fine line",
        style: "Línea fina",
        bodyArea: "Brazo",
        description: "Pieza creada desde admin.",
        tags: ["dragón"],
        published: true,
        featured: false,
        gradient: "linear-gradient(#000, #111)",
        imageUrl: "/api/portfolio/images?itemId=admin-item-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        imagePath: "portfolio-admin/admin-item-1/main.webp",
        imageMimeType: "image/webp",
        imageSizeBytes: 1200,
        imageOriginalFilename: "private-original.webp",
      } satisfies FirestorePortfolioItem,
    ]);

    const page = await PortfolioPage();
    const gallery = Array.isArray(page.props.children) ? page.props.children[1] : null;
    const items = gallery?.props.items as PublicPortfolioItem[] | undefined;
    const adminItem = items?.find((item) => item.id === "admin-item-1");

    expect(adminItem).toMatchObject({
      id: "admin-item-1",
      imageUrl: "/api/portfolio/images?itemId=admin-item-1",
    });
    expect(adminItem).not.toHaveProperty("imagePath");
    expect(adminItem).not.toHaveProperty("imageOriginalFilename");
    expect(JSON.stringify(items)).not.toContain("portfolio-admin/admin-item-1/main.webp");
    expect(JSON.stringify(items)).not.toContain("private-original.webp");
  });

  it("renders Instagram/manual media together with static fallback portfolio items", async () => {
    getFirebaseAdminFirestoreMock.mockReturnValueOnce({} as never);
    listPublicInstagramMediaMock.mockResolvedValueOnce([
      {
        id: "manual-1",
        externalId: "manual-1",
        mediaType: "IMAGE",
        caption: "Trabajo manual destacado",
        description: "Trabajo cargado manualmente.",
        mediaUrl: "https://cdn.example.test/manual-1.webp",
        thumbnailUrl: null,
        permalink: "https://www.instagram.com/p/manual-1/",
        timestamp: null,
        hidden: false,
        featured: true,
        pinned: false,
        showOnHome: true,
        portfolioOnly: false,
        order: null,
        source: "manual",
        createdAt: null,
        updatedAt: null,
      } satisfies InstagramMediaItem,
    ]);
    listPublicBackendPortfolioItemsMock.mockResolvedValueOnce([]);

    const page = await PortfolioPage();
    const gallery = Array.isArray(page.props.children) ? page.props.children[1] : null;
    const items = gallery?.props.items as PublicPortfolioItem[] | undefined;

    expect(items?.some((item) => item.id === "instagram-manual-1")).toBe(true);
    expect(items?.some((item) => item.id === "fine-line-botanical-forearm")).toBe(true);
  });
});
