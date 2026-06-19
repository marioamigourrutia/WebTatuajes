import { describe, expect, it, vi } from "vitest";
import { getFirebaseAdminFirestore } from "../firebase/admin";
import {
  getAdminPortfolioImageFile,
  getPublishedPortfolioImageFile,
  listPublishedFirestorePortfolioItems,
  mapPortfolioItemToFirestore,
  updatePortfolioPublishedStatus,
  validatePortfolioImage,
  validatePortfolioItemInput,
} from "./admin-portfolio";

vi.mock("../config/firebase-admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/firebase-admin")>();

  return {
    ...actual,
    isFirebaseAdminBackendConfigured: vi.fn(() => true),
  };
});

vi.mock("../firebase/admin", () => ({
  getFirebaseAdminFirestore: vi.fn(),
  getFirebaseAdminStorageBucket: vi.fn(),
}));

const { isFirebaseAdminBackendConfigured } = vi.mocked(await import("../config/firebase-admin"));

describe("admin portfolio helpers", () => {
  it("returns public portfolio fallback immediately when Admin backend is unconfigured", async () => {
    isFirebaseAdminBackendConfigured.mockReturnValue(false);

    await expect(listPublishedFirestorePortfolioItems()).resolves.toEqual([]);

    expect(getFirebaseAdminFirestore).not.toHaveBeenCalled();
  });

  it("lists only published Firestore portfolio items when Admin backend is configured", async () => {
    isFirebaseAdminBackendConfigured.mockReturnValue(true);
    const get = vi.fn().mockResolvedValue({
      docs: [
        {
          id: "admin-item-1",
          data: () => ({ title: "Publicado", published: true }),
        },
      ],
    });
    const limit = vi.fn(() => ({ get }));
    const where = vi.fn(() => ({ limit }));
    const collection = vi.fn(() => ({ where }));

    vi.mocked(getFirebaseAdminFirestore).mockReturnValue({ collection } as never);

    await expect(listPublishedFirestorePortfolioItems()).resolves.toMatchObject([
      { id: "admin-item-1", title: "Publicado", published: true },
    ]);
    expect(collection).toHaveBeenCalledWith("portfolio_items");
    expect(where).toHaveBeenCalledWith("published", "==", true);
  });

  it("validates and normalizes portfolio item input", () => {
    const result = validatePortfolioItemInput({
      title: "  Flor ornamental  ",
      style: "Blackwork",
      bodyArea: "Antebrazo",
      description: "Descripción corta",
      tags: "floral, negro, floral",
      published: "true",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        title: "Flor ornamental",
        style: "Blackwork",
        bodyArea: "Antebrazo",
        description: "Descripción corta",
        tags: ["floral", "negro"],
        published: true,
      },
    });
  });

  it("rejects missing required fields", () => {
    const result = validatePortfolioItemInput({ title: "", published: true });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        title: "Ingresa un título.",
        style: "Ingresa un estilo.",
        bodyArea: "Ingresa una zona del cuerpo.",
        description: "Ingresa una descripción corta.",
      });
    }
  });

  it("validates image constraints", () => {
    const svg = new File(["<svg />"], "bad.svg", { type: "image/svg+xml" });
    const result = validatePortfolioImage(svg);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.image).toBe("Solo se permiten imágenes JPG, PNG, WEBP o GIF.");
    }
  });

  it("maps portfolio input to Firestore metadata", () => {
    expect(
      mapPortfolioItemToFirestore({
        title: "Pieza",
        style: "Línea fina",
        bodyArea: "Brazo",
        description: "Descripción",
        tags: ["línea fina"],
        published: true,
      }),
    ).toEqual({
      artist_id: "admin",
      title: "Pieza",
      style: "Línea fina",
      body_area: "Brazo",
      description: "Descripción",
      tags: ["línea fina"],
      published: true,
    });
  });

  it("updates published status only after finding an existing item", async () => {
    const update = vi.fn();
    const firestore = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ exists: true }),
          update,
        })),
      })),
    };

    await expect(
      updatePortfolioPublishedStatus(firestore as never, "item-123", true),
    ).resolves.toMatchObject({
      ok: true,
      itemId: "item-123",
      published: true,
    });
    expect(update).toHaveBeenCalledWith({ published: true, updated_at: expect.anything() });
  });

  it("rejects published image metadata when the storage path belongs to another item", async () => {
    const firestore = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              published: true,
              image_path: "portfolio-admin/other-item/main.webp",
              image_mime_type: "image/webp",
              image_original_filename: "main.webp",
            }),
          }),
        })),
      })),
    };

    await expect(
      getPublishedPortfolioImageFile(firestore as never, "item-123"),
    ).resolves.toMatchObject({
      ok: false,
      status: 422,
      error: "La metadata de imagen es inválida.",
    });
  });

  it("serves unpublished portfolio image metadata to admins", async () => {
    const firestore = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              published: false,
              image_path: "portfolio-admin/item-123/main.webp",
              image_mime_type: "image/webp",
              image_original_filename: "draft.webp",
            }),
          }),
        })),
      })),
    };

    await expect(getAdminPortfolioImageFile(firestore as never, "item-123")).resolves.toEqual({
      ok: true,
      file: {
        storagePath: "portfolio-admin/item-123/main.webp",
        originalFilename: "draft.webp",
        mimeType: "image/webp",
      },
    });
  });

  it("rejects admin portfolio image metadata when the storage path belongs to another item", async () => {
    const firestore = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              published: false,
              image_path: "portfolio-admin/other-item/main.webp",
              image_mime_type: "image/webp",
              image_original_filename: "draft.webp",
            }),
          }),
        })),
      })),
    };

    await expect(getAdminPortfolioImageFile(firestore as never, "item-123")).resolves.toMatchObject(
      {
        ok: false,
        status: 422,
        error: "La metadata de imagen es inválida.",
      },
    );
  });
});
