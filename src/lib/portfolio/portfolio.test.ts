import { describe, expect, it } from "vitest";
import {
  filterPortfolioItems,
  getFeaturedPortfolioItems,
  getPortfolioStyles,
  getPortfolioTags,
  getPublishedPortfolioItems,
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
});
