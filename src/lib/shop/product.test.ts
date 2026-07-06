import { describe, expect, it, vi } from "vitest";
import {
  createProduct,
  getPurchasableFirestoreProductById,
  hideProduct,
  listPublicFirestoreProducts,
  mapFirestoreProduct,
  mapProductToFirestore,
  updateProduct,
  validateProductInput,
} from "./product";

const validProductInput = {
  code: " obr-010 ",
  title: "  Flash floral  ",
  description: "Diseño disponible.",
  priceClp: "85000",
  status: "available",
  imageUrl: "https://cdn.example.com/image.webp#fragment",
  active: "on",
  sortOrder: "2",
};

describe("product helpers", () => {
  it("validates and maps product input to Firestore fields", () => {
    const result = validateProductInput(validProductInput);

    expect(result).toMatchObject({
      ok: true,
      value: {
        code: "OBR-010",
        title: "Flash floral",
        priceClp: 85000,
        imageUrl: "https://cdn.example.com/image.webp",
        active: true,
        sortOrder: 2,
      },
    });

    if (result.ok) {
      expect(mapProductToFirestore(result.value)).toMatchObject({
        code: "OBR-010",
        price_clp: 85000,
        image_url: "https://cdn.example.com/image.webp",
        sort_order: 2,
      });
    }
  });

  it("rejects unsafe image URLs and invalid codes", () => {
    const result = validateProductInput({
      ...validProductInput,
      code: "obra 010",
      imageUrl: "http://localhost/image.webp",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        code: expect.any(String),
        imageUrl: expect.any(String),
      });
    }
  });

  it("maps Firestore documents with safe public fields", () => {
    expect(
      mapFirestoreProduct({
        id: "product-1",
        data: () => ({
          code: "OBR-010",
          title: "Flash floral",
          description: "Diseño disponible.",
          price_clp: 85000,
          status: "available",
          image_url: "javascript:alert(1)",
          active: true,
          sort_order: 5,
        }),
      }),
    ).toMatchObject({ id: "product-1", imageUrl: null, active: true, sortOrder: 5 });
  });

  it("lists only active non-hidden products and sorts in memory", async () => {
    const firestore = {
      collection: vi.fn(() => ({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            docs: [
              {
                id: "b",
                data: () => ({
                  ...mapProductToFirestore({
                    code: "B",
                    title: "B",
                    description: "B",
                    priceClp: 1,
                    status: "available",
                    imageUrl: null,
                    active: true,
                    sortOrder: 2,
                  }),
                }),
              },
              {
                id: "a",
                data: () => ({
                  ...mapProductToFirestore({
                    code: "A",
                    title: "A",
                    description: "A",
                    priceClp: 1,
                    status: "available",
                    imageUrl: null,
                    active: true,
                    sortOrder: 1,
                  }),
                }),
              },
              {
                id: "h",
                data: () => ({
                  ...mapProductToFirestore({
                    code: "H",
                    title: "H",
                    description: "H",
                    priceClp: 1,
                    status: "hidden",
                    imageUrl: null,
                    active: true,
                    sortOrder: 0,
                  }),
                }),
              },
            ],
          }),
        }),
      })),
    };

    await expect(listPublicFirestoreProducts(firestore as never)).resolves.toMatchObject([
      { id: "a", code: "A" },
      { id: "b", code: "B" },
    ]);
  });

  it("resolves only active available products for purchase requests", async () => {
    const get = vi.fn().mockResolvedValue({
      exists: true,
      id: "product-1",
      data: () => ({
        ...mapProductToFirestore({
          code: "OBR-010",
          title: "Flash floral",
          description: "Diseño disponible.",
          priceClp: 85000,
          status: "available",
          imageUrl: null,
          active: true,
          sortOrder: 1,
        }),
      }),
    });
    const firestore = { collection: vi.fn(() => ({ doc: vi.fn(() => ({ get })) })) };

    await expect(
      getPurchasableFirestoreProductById("product-1", firestore as never),
    ).resolves.toMatchObject({
      id: "product-1",
      code: "OBR-010",
    });
  });

  it("creates, updates and soft-deletes products", async () => {
    const set = vi.fn();
    const update = vi.fn();
    const doc = vi.fn((id?: string) => ({
      id: id ?? "product-1",
      set,
      get: vi.fn().mockResolvedValue({ exists: true }),
      update,
    }));
    const firestore = { collection: vi.fn(() => ({ doc })) };

    await expect(createProduct(validProductInput, firestore as never)).resolves.toMatchObject({
      ok: true,
      id: "product-1",
    });
    await expect(
      updateProduct(firestore as never, "product-1", validProductInput),
    ).resolves.toMatchObject({ ok: true, id: "product-1" });
    await expect(hideProduct(firestore as never, "product-1")).resolves.toMatchObject({
      ok: true,
      id: "product-1",
    });
    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({ active: false, status: "hidden" }),
    );
  });
});
