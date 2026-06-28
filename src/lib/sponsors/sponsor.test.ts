import { describe, expect, it, vi } from "vitest";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { createSponsor, deleteSponsor, listPublicSponsors, updateSponsor } from "./admin-sponsors";
import { mapFirestoreSponsor, mapSponsorToFirestore, validateSponsorInput } from "./sponsor";

vi.mock("@/lib/config/firebase-admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/config/firebase-admin")>();

  return { ...actual, isFirebaseAdminBackendConfigured: vi.fn(() => true) };
});

vi.mock("@/lib/firebase/admin", () => ({ getFirebaseAdminFirestore: vi.fn() }));

const { isFirebaseAdminBackendConfigured } = vi.mocked(await import("@/lib/config/firebase-admin"));

describe("sponsor helpers", () => {
  it("validates and normalizes sponsor input", () => {
    const result = validateSponsorInput({
      name: "  Agujas Pro  ",
      category: "Proveedor",
      description: "  Insumos profesionales  ",
      websiteUrl: "https://example.test/#private",
      logoUrl: "https://cdn.example.test/logo.webp#hash",
      active: "true",
      sortOrder: "2",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        name: "Agujas Pro",
        category: "Proveedor",
        description: "Insumos profesionales",
        websiteUrl: "https://example.test/",
        logoUrl: "https://cdn.example.test/logo.webp",
        active: true,
        sortOrder: 2,
      },
    });
  });

  it("rejects unsafe sponsor input", () => {
    const result = validateSponsorInput({
      name: "",
      category: "",
      description: "",
      websiteUrl: "javascript:alert(1)",
      logoUrl: "http://localhost/logo.webp",
      sortOrder: 1000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        name: "Ingresa el nombre del colaborador.",
        category: "Ingresa una categoría.",
        description: "Ingresa una descripción breve.",
        websiteUrl: expect.any(String),
        logoUrl: expect.any(String),
        sortOrder: "Usa un orden entre 0 y 999.",
      });
    }
  });

  it("rejects private-ish website hosts for public sponsor links", () => {
    for (const websiteUrl of [
      "http://localhost/sponsor",
      "https://studio.localhost/sponsor",
      "http://127.0.0.1/sponsor",
      "http://10.0.0.1/sponsor",
      "http://[::1]/sponsor",
      "https://internal/sponsor",
      "https:example.com/sponsor",
    ]) {
      const result = validateSponsorInput({
        name: "Agujas Pro",
        category: "Proveedor",
        description: "Insumos profesionales",
        websiteUrl,
        active: true,
      });

      expect(result.ok, websiteUrl).toBe(false);
      if (!result.ok) expect(result.errors.websiteUrl).toEqual(expect.any(String));
    }
  });

  it("keeps valid public http and https sponsor website URLs", () => {
    for (const websiteUrl of ["http://example.com/sponsor", "https://example.com/sponsor"]) {
      const result = validateSponsorInput({
        name: "Agujas Pro",
        category: "Proveedor",
        description: "Insumos profesionales",
        websiteUrl,
        active: true,
      });

      expect(result.ok, websiteUrl).toBe(true);
      if (result.ok) expect(result.value.websiteUrl).toBe(websiteUrl);
    }
  });

  it("maps sponsor input to Firestore metadata", () => {
    expect(
      mapSponsorToFirestore({
        name: "Agujas Pro",
        category: "Proveedor",
        description: "Insumos profesionales",
        websiteUrl: "https://example.test/",
        logoUrl: null,
        active: true,
        sortOrder: 1,
      }),
    ).toEqual({
      name: "Agujas Pro",
      category: "Proveedor",
      description: "Insumos profesionales",
      website_url: "https://example.test/",
      logo_url: null,
      active: true,
      sort_order: 1,
    });
  });

  it("maps Firestore sponsors to a safe public shape", () => {
    expect(
      mapFirestoreSponsor({
        id: "sponsor-1",
        data: () => ({
          name: " Sponsor ",
          category: "Marca",
          description: "Descripción",
          website_url: "https://example.test/#private",
          logo_url: "javascript:alert(1)",
          active: true,
          sort_order: 3,
        }),
      }),
    ).toMatchObject({
      id: "sponsor-1",
      name: "Sponsor",
      websiteUrl: "https://example.test/",
      logoUrl: null,
      active: true,
      sortOrder: 3,
    });
  });

  it("creates sponsors in Firestore with server timestamps", async () => {
    const set = vi.fn();
    const firestore = {
      collection: vi.fn(() => ({ doc: vi.fn(() => ({ id: "sponsor-123", set })) })),
    };

    await expect(
      createSponsor(
        { name: "Agujas Pro", category: "Proveedor", description: "Insumos", active: true },
        firestore as never,
      ),
    ).resolves.toMatchObject({ ok: true, id: "sponsor-123" });
    expect(firestore.collection).toHaveBeenCalledWith("sponsors");
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ name: "Agujas Pro" }));
  });

  it("updates sponsors only after finding an existing document", async () => {
    const update = vi.fn();
    const firestore = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ exists: true }), update })),
      })),
    };

    await expect(
      updateSponsor(firestore as never, "sponsor-123", {
        name: "Agujas Pro",
        category: "Proveedor",
        description: "Insumos",
        active: false,
      }),
    ).resolves.toMatchObject({ ok: true, id: "sponsor-123" });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
  });

  it("deletes sponsors only after finding an existing document", async () => {
    const deleteDocument = vi.fn();
    const firestore = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ exists: true }),
          delete: deleteDocument,
        })),
      })),
    };

    await expect(deleteSponsor(firestore as never, "sponsor-123")).resolves.toMatchObject({
      ok: true,
      id: "sponsor-123",
    });
    expect(deleteDocument).toHaveBeenCalled();
  });

  it("lists only active public sponsors sorted by order and name within the limit", async () => {
    const where = vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({
        docs: [
          {
            id: "sponsor-c",
            data: () => ({
              name: "Zeta",
              category: "Marca",
              description: "Sponsor C",
              active: true,
              sort_order: 2,
            }),
          },
          {
            id: "sponsor-a",
            data: () => ({
              name: "Alfa",
              category: "Marca",
              description: "Sponsor A",
              active: true,
              sort_order: 1,
            }),
          },
          {
            id: "sponsor-b",
            data: () => ({
              name: "Beta",
              category: "Marca",
              description: "Sponsor B",
              active: true,
              sort_order: 1,
            }),
          },
        ],
      }),
    });
    const firestore = { collection: vi.fn(() => ({ where })) };

    await expect(listPublicSponsors(firestore as never, 2)).resolves.toMatchObject([
      { id: "sponsor-a", active: true, sortOrder: 1 },
      { id: "sponsor-b", active: true, sortOrder: 1 },
    ]);
    expect(firestore.collection).toHaveBeenCalledWith("sponsors");
    expect(where).toHaveBeenCalledWith("active", "==", true);
  });

  it("returns no public sponsors when Admin backend is unconfigured", async () => {
    isFirebaseAdminBackendConfigured.mockReturnValue(false);

    await expect(listPublicSponsors()).resolves.toEqual([]);

    expect(getFirebaseAdminFirestore).not.toHaveBeenCalled();
  });
});
