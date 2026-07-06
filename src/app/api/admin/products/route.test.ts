import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH, POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { createProduct, hideProduct, listAdminProducts, updateProduct } from "@/lib/shop/product";

vi.mock("@/lib/auth/bearer", () => ({ getBearerToken: vi.fn(() => "id-token") }));
vi.mock("@/lib/auth/server", () => ({ getServerAuthStatusFromIdToken: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({ getFirebaseAdminFirestore: vi.fn() }));
vi.mock("@/lib/shop/product", () => ({
  createProduct: vi.fn(),
  hideProduct: vi.fn(),
  listAdminProducts: vi.fn(),
  updateProduct: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const createProductMock = vi.mocked(createProduct);
const hideProductMock = vi.mocked(hideProduct);
const listAdminProductsMock = vi.mocked(listAdminProducts);
const updateProductMock = vi.mocked(updateProduct);

describe("admin products route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    createProductMock.mockResolvedValue({ ok: true, id: "product-123" });
    updateProductMock.mockResolvedValue({ ok: true, id: "product-123" });
    hideProductMock.mockResolvedValue({ ok: true, id: "product-123" });
    listAdminProductsMock.mockResolvedValue([]);
  });

  it("revalidates admin role before creating a product", async () => {
    const body = { code: "OBR-010", title: "Flash" };
    const response = await POST(
      new Request("http://localhost/api/admin/products", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: "product-123" });
    expect(getServerAuthStatusFromIdTokenMock).toHaveBeenCalledWith("id-token");
    expect(createProductMock).toHaveBeenCalledWith(body);
  });

  it("rejects non-admin users before mutating products", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/products", { method: "POST", body: "{}" }),
    );

    expect(response.status).toBe(403);
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it("lists admin products", async () => {
    listAdminProductsMock.mockResolvedValue([{ id: "product-123", code: "OBR-010" } as never]);

    const response = await GET(new Request("http://localhost/api/admin/products"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ products: [{ id: "product-123" }] });
  });

  it("updates products through the helper", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/admin/products", {
        method: "PATCH",
        body: JSON.stringify({ productId: "product-123", code: "OBR-010" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updateProductMock).toHaveBeenCalledWith(
      expect.anything(),
      "product-123",
      expect.anything(),
    );
  });

  it("soft-deletes products through the helper", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/admin/products", {
        method: "DELETE",
        body: JSON.stringify({ productId: "product-123" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(hideProductMock).toHaveBeenCalledWith(expect.anything(), "product-123");
  });
});
