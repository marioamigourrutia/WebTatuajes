import { describe, expect, it } from "vitest";
import { getPublicShopProducts, getPurchasableProductById, productStatusLabels } from "./catalog";

describe("shop catalog", () => {
  it("exposes public products without hidden drafts", () => {
    const products = getPublicShopProducts();

    expect(products.length).toBeGreaterThan(0);
    expect(products.every((product) => product.status !== "hidden")).toBe(true);
    expect(products.map((product) => product.code)).toContain("OBR-001");
  });

  it("only allows available products to be requested", () => {
    expect(getPurchasableProductById("flash-peonia-linea-fina")?.code).toBe("OBR-001");
    expect(getPurchasableProductById("flash-serpiente-blackwork")).toBeNull();
  });

  it("uses Chilean Spanish status labels", () => {
    expect(productStatusLabels).toMatchObject({
      available: "Disponible",
      reserved: "Reservado",
      sold: "Vendido",
      hidden: "Oculto",
    });
  });

  it("keeps only safe http/https external image URLs in public products", () => {
    const products = getPublicShopProducts();

    expect(
      products.every((product) => !product.imageUrl || /^https?:\/\//.test(product.imageUrl)),
    ).toBe(true);
  });
});
