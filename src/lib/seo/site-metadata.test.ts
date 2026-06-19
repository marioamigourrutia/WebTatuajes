import { describe, expect, it } from "vitest";
import {
  buildRootMetadata,
  buildSitemapEntries,
  getSiteUrl,
  publicSiteRoutes,
} from "./site-metadata";

describe("site metadata", () => {
  it("uses a safe local fallback when the site URL is missing or invalid", () => {
    expect(getSiteUrl(undefined).toString()).toBe("http://localhost:3000/");
    expect(getSiteUrl("not-a-url").toString()).toBe("http://localhost:3000/");
  });

  it("centralizes public discovery routes without private admin routes", () => {
    expect(publicSiteRoutes).toEqual(["/", "/quote", "/portfolio", "/servicios", "/contacto"]);
    expect(publicSiteRoutes.some((route) => route.startsWith("/admin"))).toBe(false);
  });

  it("builds absolute sitemap entries from the configured site URL", () => {
    expect(buildSitemapEntries(new URL("https://example.cl"))).toEqual([
      expect.objectContaining({ url: "https://example.cl/", priority: 1 }),
      expect.objectContaining({ url: "https://example.cl/quote", priority: 0.7 }),
      expect.objectContaining({ url: "https://example.cl/portfolio", priority: 0.7 }),
      expect.objectContaining({ url: "https://example.cl/servicios", priority: 0.7 }),
      expect.objectContaining({ url: "https://example.cl/contacto", priority: 0.7 }),
    ]);
  });

  it("provides root metadata with title template and social basics", () => {
    const metadata = buildRootMetadata(new URL("https://example.cl"));

    expect(metadata.metadataBase?.toString()).toBe("https://example.cl/");
    expect(metadata.title).toEqual({
      default: "WebTatuajes — Estudio profesional de tatuajes",
      template: "%s — WebTatuajes",
    });
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({ locale: "es_CL", type: "website", url: "/" }),
    );
    expect(metadata.twitter).toEqual(expect.objectContaining({ card: "summary" }));
  });
});
