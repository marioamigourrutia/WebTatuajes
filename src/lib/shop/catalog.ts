import { sanitizeExternalImageUrl } from "@/lib/images/external-image-url";

export const productStatuses = ["available", "reserved", "sold", "hidden"] as const;

export type ProductStatus = (typeof productStatuses)[number];

export type ShopProduct = {
  id: string;
  code: string;
  title: string;
  description: string;
  priceClp: number;
  status: ProductStatus;
  imageUrl?: string;
};

export const productStatusLabels: Record<ProductStatus, string> = {
  available: "Disponible",
  reserved: "Reservado",
  sold: "Vendido",
  hidden: "Oculto",
};

export const shopProducts: readonly ShopProduct[] = [
  {
    id: "flash-peonia-linea-fina",
    code: "OBR-001",
    title: "Peonía en línea fina",
    description:
      "Diseño disponible para brazo o pierna. Se ajusta tamaño y ubicación antes de reservar.",
    priceClp: 85000,
    status: "available",
  },
  {
    id: "flash-serpiente-blackwork",
    code: "OBR-002",
    title: "Serpiente blackwork",
    description:
      "Pieza de alto contraste pensada para antebrazo. Requiere evaluación breve de zona.",
    priceClp: 120000,
    status: "reserved",
  },
  {
    id: "lamina-botanica-sombra-suave",
    code: "OBR-003",
    title: "Lámina botánica con sombra suave",
    description:
      "Obra disponible para adaptar como tatuaje o referencia de composición personalizada.",
    priceClp: 95000,
    status: "available",
  },
  {
    id: "obra-oculta-borrador",
    code: "OBR-004",
    title: "Borrador interno",
    description: "No debe aparecer en la vista pública.",
    priceClp: 1,
    status: "hidden",
  },
];

export function getPublicShopProducts() {
  return shopProducts
    .filter((product) => product.status !== "hidden")
    .map((product) => ({
      ...product,
      imageUrl: sanitizeExternalImageUrl(product.imageUrl) ?? undefined,
    }));
}

export function getPurchasableProductById(productId: string) {
  const product = shopProducts.find((item) => item.id === productId);

  return product?.status === "available" ? product : null;
}

export function formatClpPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}
