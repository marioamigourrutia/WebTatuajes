import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPublishedPortfolioItems,
  type FirestorePortfolioItem,
  type PublicPortfolioItem,
} from "@/lib/portfolio/portfolio";
import { listPublicBackendPortfolioItems } from "@/lib/portfolio/public-portfolio-backend";
import PortfolioPage, { dynamic } from "./page";

vi.mock("@/lib/portfolio/public-portfolio-backend", () => ({
  listPublicBackendPortfolioItems: vi.fn(),
}));

const listPublicBackendPortfolioItemsMock = vi.mocked(listPublicBackendPortfolioItems);

describe("portfolio page rendering", () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
});
