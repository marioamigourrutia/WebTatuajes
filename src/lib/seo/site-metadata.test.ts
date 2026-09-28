import { describe, expect, it } from "vitest";
import {
  buildRootMetadata,
  buildSitemapEntries,
  getSiteUrl,
  publicSiteRoutes,
  siteMetadata,
} from "./site-metadata";

describe("site metadata", () => {
  it("uses a safe local fallback when the site URL is missing or invalid", () => {
    expect(getSiteUrl(undefined).toString()).toBe("http://localhost:3000/");
    expect(getSiteUrl("not-a-url").toString()).toBe("http://localhost:3000/");
  });

  it("centralizes the current public discovery routes without admin or legacy sections", () => {
    expect(publicSiteRoutes).toEqual([
      "/",
      "/contacto",
      "/quote",
      "/quote/status",
      "/opiniones",
      "/comunidad",
      "/colaboradores",
      "/privacidad",
      "/terminos-reserva",
    ]);
    expect(publicSiteRoutes.some((route) => route.startsWith("/admin"))).toBe(false);
    expect(publicSiteRoutes).not.toContain("/portfolio");
    expect(publicSiteRoutes).not.toContain("/servicios");
    expect(publicSiteRoutes).not.toContain("/tienda");
    expect(publicSiteRoutes).not.toContain("/manejo-imagenes");
  });

  it("builds absolute sitemap entries from the configured site URL", () => {
    const entries = buildSitemapEntries(new URL("https://example.cl"));

    expect(entries).toHaveLength(publicSiteRoutes.length);
    expect(entries[0]).toEqual(expect.objectContaining({ url: "https://example.cl/", priority: 1 }));
    expect(entries).toContainEqual(
      expect.objectContaining({ url: "https://example.cl/quote", priority: 0.9 }),
    );
    expect(entries).toContainEqual(
      expect.objectContaining({ url: "https://example.cl/contacto", priority: 0.7 }),
    );
    expect(entries.some((entry) => entry.url.endsWith("/portfolio"))).toBe(false);
    expect(entries.some((entry) => entry.url.endsWith("/servicios"))).toBe(false);
    expect(entries.some((entry) => entry.url.endsWith("/tienda"))).toBe(false);
    expect(entries.some((entry) => entry.url.endsWith("/manejo-imagenes"))).toBe(false);
  });

  it("provides root metadata with current brand title and social basics", () => {
    const metadata = buildRootMetadata(new URL("https://example.cl"));

    expect(metadata.metadataBase?.toString()).toBe("https://example.cl/");
    expect(metadata.title).toEqual({
      default: `${siteMetadata.title} — Realismo black & grey`,
      template: `%s — ${siteMetadata.title}`,
    });
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({ locale: "es_CL", type: "website", url: "/" }),
    );
    expect(metadata.twitter).toEqual(expect.objectContaining({ card: "summary_large_image" }));
  });
});
