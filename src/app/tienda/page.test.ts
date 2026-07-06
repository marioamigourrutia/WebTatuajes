import { describe, expect, it, vi } from "vitest";
import { type ShopProduct } from "@/lib/shop/catalog";

const getPublicShopProductsWithFirestoreFallback = vi.fn();

vi.mock("@/lib/shop/catalog-server", () => ({
  getPublicShopProductsWithFirestoreFallback,
}));

const firestoreProduct: ShopProduct = {
  id: "firestore-product",
  code: "OBR-100",
  title: "Obra desde Firestore",
  description: "Obra confirmada desde el catálogo dinámico.",
  priceClp: 100000,
  status: "available",
};

const fallbackProduct: ShopProduct = {
  id: "fallback-product",
  code: "OBR-001",
  title: "Obra referencial",
  description: "Referencia temporal del catálogo.",
  priceClp: 85000,
  status: "available",
};

describe("shop page", () => {
  it("describes available works and WhatsApp coordination", async () => {
    const { metadata } = await import("./page");

    expect(metadata.title).toBe("Obras disponibles");
    expect(metadata.description).toContain("sin pagos en línea");
  });

  it("keeps purchase request behavior for Firestore products", async () => {
    getPublicShopProductsWithFirestoreFallback.mockResolvedValue({
      products: [firestoreProduct],
      source: "firestore",
    });
    const { default: ShopPage } = await import("./page");

    const page = await ShopPage();
    const content = JSON.stringify(page);

    expect(content).toContain("Obras disponibles");
    expect(content).toContain("OBR-100");
    expect(content).toContain("Solicitar compra");
    expect(content).toContain("solicitar-compra");
    expect(content).toContain('"products":[{"id":"firestore-product"');
    expect(content).not.toContain("Catálogo temporal en modo referencia");
  });

  it("marks fallback catalog as reference-only and hides the purchase form", async () => {
    getPublicShopProductsWithFirestoreFallback.mockResolvedValue({
      products: [fallbackProduct],
      source: "fallback",
    });
    const { default: ShopPage } = await import("./page");

    const page = await ShopPage();
    const content = JSON.stringify(page);

    expect(content).toContain("Catálogo temporal en modo referencia");
    expect(content).toContain("Las piezas mostradas son referenciales");
    expect(content).toContain("Coordinar por contacto");
    expect(content).not.toContain("Solicitar compra");
    expect(content).not.toContain("solicitar-compra");
    expect(content).not.toContain('"products":[');
    expect(content).not.toContain("Guardar y preparar WhatsApp");
  });

  it("shows an empty state when Firestore succeeds with no products", async () => {
    getPublicShopProductsWithFirestoreFallback.mockResolvedValue({
      products: [],
      source: "firestore",
    });
    const { default: ShopPage } = await import("./page");

    const page = await ShopPage();
    const content = JSON.stringify(page);

    expect(content).toContain("No hay obras disponibles publicadas por el momento");
    expect(content).not.toContain("Catálogo temporal en modo referencia");
    expect(content).not.toContain("OBR-001");
    expect(content).not.toContain("solicitar-compra");
    expect(content).not.toContain('"products":[');
  });
});
