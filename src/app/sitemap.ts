import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/lib/seo/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemapEntries();
}
