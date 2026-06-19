import { describe, expect, it } from "vitest";
import {
  filterPortfolioItems,
  combinePortfolioItems,
  getFeaturedPortfolioItems,
  getPortfolioStyles,
  getPortfolioTags,
  getPublishedPortfolioItems,
  mapFirestorePortfolioItem,
  toPublicPortfolioItem,
  type PortfolioItem,
} from "./portfolio";

const items: PortfolioItem[] = [
  {
    id: "published-blackwork",
    title: "Blackwork publicado",
    style: "Blackwork",
    bodyArea: "Brazo",
    description: "Trabajo visible.",
    tags: ["negro", "geométrico"],
    published: true,
    featured: true,
    gradient: "linear-gradient(#000, #111)",
  },
  {
    id: "published-fine-line",
    title: "Línea fina publicada",
    style: "Línea fina",
    bodyArea: "Antebrazo",
    description: "Trabajo visible.",
    tags: ["minimalista", "negro"],
    published: true,
    featured: false,
    gradient: "linear-gradient(#111, #222)",
  },
  {
    id: "private-piece",
    title: "Pieza privada",
    style: "Privado",
    bodyArea: "Espalda",
    description: "Trabajo oculto.",
    tags: ["reservado"],
    published: false,
    featured: true,
    gradient: "linear-gradient(#222, #333)",
  },
];

describe("portfolio helpers", () => {
  it("returns only published items sorted by title", () => {
    expect(getPublishedPortfolioItems(items).map((item) => item.id)).toEqual([
      "published-blackwork",
      "published-fine-line",
    ]);
  });

  it("returns featured portfolio items without exposing unpublished pieces", () => {
    expect(getFeaturedPortfolioItems(3).every((item) => item.published && item.featured)).toBe(
      true,
    );
  });

  it("builds unique style and tag filters from published items only", () => {
    expect(getPortfolioStyles(items)).toEqual(["Blackwork", "Línea fina"]);
    expect(getPortfolioTags(items)).toEqual(["geométrico", "minimalista", "negro"]);
  });

  it("filters published items by style and tag", () => {
    expect(filterPortfolioItems({ style: "blackwork" }, items).map((item) => item.id)).toEqual([
      "published-blackwork",
    ]);
    expect(filterPortfolioItems({ tag: "negro" }, items).map((item) => item.id)).toEqual([
      "published-blackwork",
      "published-fine-line",
    ]);
    expect(filterPortfolioItems({ style: "línea fina", tag: "minimalista" }, items)).toHaveLength(
      1,
    );
  });

  it("maps Firestore portfolio items for the public gallery", () => {
    const item = mapFirestorePortfolioItem({
      id: "admin-item-1",
      data: () => ({
        title: "Dragón fine line",
        style: "Línea fina",
        body_area: "Brazo",
        description: "Pieza creada desde admin.",
        tags: ["dragón", "negro", "negro"],
        published: true,
        image_path: "portfolio-admin/admin-item-1/main.webp",
        image_mime_type: "image/webp",
        image_size_bytes: 1200,
        image_original_filename: "dragon.webp",
      }),
    });

    expect(item).toMatchObject({
      id: "admin-item-1",
      title: "Dragón fine line",
      bodyArea: "Brazo",
      tags: ["dragón", "negro"],
      imageUrl: "/api/portfolio/images?itemId=admin-item-1",
    });
  });

  it("sanitizes portfolio items before serializing public gallery props", () => {
    const item = mapFirestorePortfolioItem({
      id: "admin-item-1",
      data: () => ({
        title: "Dragón fine line",
        style: "Línea fina",
        body_area: "Brazo",
        description: "Pieza creada desde admin.",
        tags: ["dragón"],
        published: true,
        image_path: "portfolio-admin/admin-item-1/main.webp",
        image_mime_type: "image/webp",
        image_size_bytes: 1200,
        image_original_filename: "private-original.webp",
      }),
    });

    const publicItem = toPublicPortfolioItem(item);

    expect(publicItem).toMatchObject({
      id: "admin-item-1",
      imageUrl: "/api/portfolio/images?itemId=admin-item-1",
    });
    expect(publicItem).not.toHaveProperty("imagePath");
    expect(publicItem).not.toHaveProperty("imageOriginalFilename");
    expect(publicItem).not.toHaveProperty("imageMimeType");
    expect(publicItem).not.toHaveProperty("imageSizeBytes");
    expect(JSON.stringify(publicItem)).not.toContain("portfolio-admin/admin-item-1/main.webp");
    expect(JSON.stringify(publicItem)).not.toContain("private-original.webp");
  });

  it("combines static and firestore items without exposing drafts", () => {
    const baseItem = items[0] as PortfolioItem;

    expect(
      combinePortfolioItems(items, [
        { ...baseItem, id: "firestore-draft", title: "Draft", published: false },
        { ...baseItem, id: "firestore-live", title: "Admin publicado", published: true },
      ]).map((item) => item.id),
    ).toEqual(["firestore-live", "published-blackwork", "published-fine-line"]);
  });
});
