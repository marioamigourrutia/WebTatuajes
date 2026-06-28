import type { Metadata } from "next";
import type { MetadataRoute } from "next";
import { appConfig } from "@/lib/config/app";

const LOCAL_SITE_URL = "http://localhost:3000";

export const publicSiteRoutes = [
  "/",
  "/quote",
  "/portfolio",
  "/opiniones",
  "/tienda",
  "/servicios",
  "/contacto",
] as const;

export function getSiteUrl(value = process.env.NEXT_PUBLIC_SITE_URL): URL {
  try {
    return new URL(value ?? LOCAL_SITE_URL);
  } catch {
    return new URL(LOCAL_SITE_URL);
  }
}

export const siteMetadata = {
  title: appConfig.studioName,
  description: `${appConfig.studioName}, estudio de tatuajes de ${appConfig.artistName} en Chile: portafolio, servicios, cuidados y cotizaciones privadas para proyectos personalizados.`,
  locale: "es_CL",
} as const;

export function buildRootMetadata(siteUrl = getSiteUrl()): Metadata {
  return {
    title: {
      default: `${siteMetadata.title} — Estudio profesional de tatuajes`,
      template: `%s — ${siteMetadata.title}`,
    },
    description: siteMetadata.description,
    metadataBase: siteUrl,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: siteMetadata.title,
      description: siteMetadata.description,
      url: "/",
      siteName: siteMetadata.title,
      locale: siteMetadata.locale,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: siteMetadata.title,
      description: siteMetadata.description,
    },
  };
}

export function buildSitemapEntries(siteUrl = getSiteUrl()): MetadataRoute.Sitemap {
  return publicSiteRoutes.map((route) => ({
    url: new URL(route, siteUrl).toString(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
