import type { InstagramMediaItem } from "./instagram-media";
import type { PortfolioItem } from "@/lib/portfolio/portfolio";

const fallbackGradient = "linear-gradient(135deg, #1c1917 0%, #44403c 52%, #d6a25e 100%)";

export function instagramMediaToPortfolioItem(item: InstagramMediaItem): PortfolioItem {
  return {
    id: `instagram-${item.id}`,
    title: item.caption.split("\n")[0]?.slice(0, 100) || "Trabajo desde Instagram",
    style: "Instagram",
    bodyArea: "Zona a consultar",
    description: item.description || item.caption || "Trabajo publicado desde media administrada.",
    tags: [
      item.mediaType.toLocaleLowerCase("es-CL"),
      item.source === "manual" ? "manual" : "instagram",
    ],
    published: !item.hidden,
    featured: item.featured || item.showOnHome || item.pinned,
    gradient: fallbackGradient,
    imageUrl: item.mediaType === "VIDEO" ? item.thumbnailUrl || item.mediaUrl : item.mediaUrl,
    permalink: item.permalink,
    source: "instagram_media",
  };
}

export function instagramMediaToPortfolioItems(items: InstagramMediaItem[]): PortfolioItem[] {
  return items.map(instagramMediaToPortfolioItem);
}
