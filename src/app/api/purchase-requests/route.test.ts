import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createPurchaseRequest } from "@/lib/shop/purchase-request";

vi.mock("@/lib/shop/purchase-request", () => ({
  createPurchaseRequest: vi.fn(),
}));

const createPurchaseRequestMock = vi.mocked(createPurchaseRequest);

function request(body: unknown) {
  return new Request("http://localhost/api/purchase-requests", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function botFields() {
  return { companyWebsite: "", submittedAt: String(Date.now() - 3000) };
}

describe("purchase requests route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createPurchaseRequestMock.mockResolvedValue({
      ok: true,
      id: "purchase-123",
      purchaseCode: "COM-2026-ABCDE",
      whatsappUrl: "https://wa.me/56900000000?text=hola",
    });
  });

  it("is public and creates a purchase request without auth headers", async () => {
    const body = { productId: "flash-peonia-linea-fina", customerName: "Ana", ...botFields() };
    const response = await POST(request(body));

    await expect(response.json()).resolves.toEqual({
      id: "purchase-123",
      purchaseCode: "COM-2026-ABCDE",
      whatsappUrl: "https://wa.me/56900000000?text=hola",
    });
    expect(response.status).toBe(201);
    expect(createPurchaseRequestMock).toHaveBeenCalledWith({
      productId: "flash-peonia-linea-fina",
      customerName: "Ana",
    });
  });

  it("returns validation errors from the request helper", async () => {
    createPurchaseRequestMock.mockResolvedValue({
      ok: false,
      status: 400,
      errors: { phone: "Ingresa un teléfono de contacto." },
    });

    const response = await POST(request(botFields()));

    await expect(response.json()).resolves.toEqual({
      errors: { phone: "Ingresa un teléfono de contacto." },
    });
    expect(response.status).toBe(400);
  });

  it("rejects invalid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/purchase-requests", { method: "POST", body: "{" }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects bot-like submissions before creating a purchase request", async () => {
    const response = await POST(
      request({
        productId: "flash-peonia-linea-fina",
        customerName: "Ana",
        companyWebsite: "https://spam.test",
        submittedAt: String(Date.now() - 3000),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errors: { form: "No pudimos procesar la solicitud. Intenta nuevamente." },
    });
    expect(createPurchaseRequestMock).not.toHaveBeenCalled();
  });
});
