export type PortfolioItem = {
  id: string;
  title: string;
  style: string;
  bodyArea: string;
  description: string;
  tags: string[];
  published: boolean;
  featured: boolean;
  gradient: string;
};

export type PortfolioFilter = {
  style?: string;
  tag?: string;
};

export const portfolioItems: PortfolioItem[] = [
  {
    id: "fine-line-botanical-forearm",
    title: "Botánica en línea fina",
    style: "Línea fina",
    bodyArea: "Antebrazo",
    description:
      "Composición delicada con ritmo vertical, pensada para acompañar el movimiento natural del brazo.",
    tags: ["botánico", "minimalista", "negro"],
    published: true,
    featured: true,
    gradient: "linear-gradient(135deg, #292524 0%, #57534e 45%, #d6a25e 100%)",
  },
  {
    id: "blackwork-ornamental-shoulder",
    title: "Ornamental blackwork",
    style: "Blackwork",
    bodyArea: "Hombro",
    description:
      "Bloques negros y detalles geométricos para una pieza con presencia, contraste y lectura clara.",
    tags: ["ornamental", "geométrico", "alto contraste"],
    published: true,
    featured: true,
    gradient: "linear-gradient(135deg, #0c0a09 0%, #1c1917 50%, #78716c 100%)",
  },
  {
    id: "soft-shading-floral-rib",
    title: "Florales con sombra suave",
    style: "Sombras suaves",
    bodyArea: "Costillas",
    description:
      "Pieza floral con volumen sutil, diseñada para mantener una sensación liviana y elegante.",
    tags: ["floral", "delicado", "sombra"],
    published: true,
    featured: true,
    gradient: "linear-gradient(135deg, #1c1917 0%, #44403c 45%, #a16207 100%)",
  },
  {
    id: "cover-up-concept-upper-arm",
    title: "Cover-up evaluado",
    style: "Cover-up",
    bodyArea: "Brazo superior",
    description:
      "Propuesta de cobertura con lectura oscura y zonas de descanso para integrar una pieza previa.",
    tags: ["cover-up", "personalizado", "oscuro"],
    published: true,
    featured: false,
    gradient: "linear-gradient(135deg, #111827 0%, #312e81 48%, #a16207 100%)",
  },
  {
    id: "micro-symbols-wrist",
    title: "Símbolos mínimos",
    style: "Minimalista",
    bodyArea: "Muñeca",
    description:
      "Set de símbolos pequeños con foco en proporción, separación y envejecimiento legible.",
    tags: ["micro", "minimalista", "línea fina"],
    published: true,
    featured: false,
    gradient: "linear-gradient(135deg, #27272a 0%, #52525b 55%, #f5d0fe 100%)",
  },
  {
    id: "private-concept-backpiece",
    title: "Concepto reservado",
    style: "Personalizado",
    bodyArea: "Espalda",
    description: "Trabajo privado no visible en el portafolio público.",
    tags: ["privado"],
    published: false,
    featured: false,
    gradient: "linear-gradient(135deg, #1f2937 0%, #374151 100%)",
  },
];

const sortByTitle = (items: PortfolioItem[]) =>
  [...items].sort((first, second) => first.title.localeCompare(second.title, "es-CL"));

export function getPublishedPortfolioItems(
  items: PortfolioItem[] = portfolioItems,
): PortfolioItem[] {
  return sortByTitle(items.filter((item) => item.published));
}

export function getFeaturedPortfolioItems(limit = 3): PortfolioItem[] {
  return getPublishedPortfolioItems()
    .filter((item) => item.featured)
    .slice(0, limit);
}

export function getPortfolioStyles(items: PortfolioItem[] = portfolioItems): string[] {
  return [...new Set(getPublishedPortfolioItems(items).map((item) => item.style))].sort(
    (first, second) => first.localeCompare(second, "es-CL"),
  );
}

export function getPortfolioTags(items: PortfolioItem[] = portfolioItems): string[] {
  return [...new Set(getPublishedPortfolioItems(items).flatMap((item) => item.tags))].sort(
    (first, second) => first.localeCompare(second, "es-CL"),
  );
}

export function filterPortfolioItems(
  filters: PortfolioFilter,
  items: PortfolioItem[] = portfolioItems,
): PortfolioItem[] {
  const normalizedStyle = filters.style?.trim().toLocaleLowerCase("es-CL");
  const normalizedTag = filters.tag?.trim().toLocaleLowerCase("es-CL");

  return getPublishedPortfolioItems(items).filter((item) => {
    const matchesStyle = normalizedStyle
      ? item.style.toLocaleLowerCase("es-CL") === normalizedStyle
      : true;
    const matchesTag = normalizedTag
      ? item.tags.some((tag) => tag.toLocaleLowerCase("es-CL") === normalizedTag)
      : true;

    return matchesStyle && matchesTag;
  });
}
