import { describe, expect, it, vi } from "vitest";
import { getPublicShopProducts } from "./catalog";
import { getPublicShopProductsWithFirestoreFallback } from "./catalog-server";
import { mapProductToFirestore } from "./product";

describe("server shop catalog", () => {
  it("uses fallback products only when Firestore is unavailable", async () => {
    const result = await getPublicShopProductsWithFirestoreFallback();

    expect(result).toEqual({ products: getPublicShopProducts(), source: "fallback" });
  });

  it("returns Firestore products, including an honest empty dynamic catalog", async () => {
    const firestore = {
      collection: vi.fn(() => ({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ docs: [] }),
        }),
      })),
    };

    await expect(getPublicShopProductsWithFirestoreFallback(firestore as never)).resolves.toEqual({
      products: [],
      source: "firestore",
    });
  });

  it("returns Firestore products when backend succeeds", async () => {
    const firestore = {
      collection: vi.fn(() => ({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            docs: [
              {
                id: "product-1",
                data: () =>
                  mapProductToFirestore({
                    code: "OBR-100",
                    title: "Obra desde Firestore",
                    description: "Catálogo dinámico.",
                    priceClp: 100000,
                    status: "available",
                    imageUrl: null,
                    active: true,
                    sortOrder: 1,
                  }),
              },
            ],
          }),
        }),
      })),
    };

    await expect(getPublicShopProductsWithFirestoreFallback(firestore as never)).resolves.toEqual({
      products: [
        expect.objectContaining({
          id: "product-1",
          code: "OBR-100",
          title: "Obra desde Firestore",
        }),
      ],
      source: "firestore",
    });
  });
});
