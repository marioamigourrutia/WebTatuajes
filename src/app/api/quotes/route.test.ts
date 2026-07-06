import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyCustomerIdToken } from "@/lib/auth/customer-token";
import { resetRateLimitForTests } from "@/lib/rate-limit";
import { createQuoteRequestFromFormData } from "@/lib/quotes/quote-request";
import { POST } from "./route";

vi.mock("@/lib/auth/customer-token", () => ({
  verifyCustomerIdToken: vi.fn(),
}));

vi.mock("@/lib/quotes/quote-request", () => ({
  createQuoteRequestFromFormData: vi.fn(),
  createQuoteRequest: vi.fn(),
}));

const verifyCustomerIdTokenMock = vi.mocked(verifyCustomerIdToken);
const createQuoteRequestFromFormDataMock = vi.mocked(createQuoteRequestFromFormData);

function multipartRequest(token?: string, authorization?: string) {
  const formData = new FormData();
  formData.set("email", "ana@example.test");
  formData.set("companyWebsite", "");
  formData.set("submittedAt", String(Date.now() - 3000));

  return new Request("http://localhost/api/quotes", {
    method: "POST",
    headers:
      authorization !== undefined
        ? { Authorization: authorization }
        : token
          ? { Authorization: `Bearer ${token}` }
          : undefined,
    body: formData,
  });
}

function botMultipartRequest(token?: string) {
  const formData = new FormData();
  formData.set("email", "ana@example.test");
  formData.set("companyWebsite", "https://spam.test");
  formData.set("submittedAt", String(Date.now() - 3000));

  return new Request("http://localhost/api/quotes", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
}

describe("quote creation route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetRateLimitForTests();
    verifyCustomerIdTokenMock.mockResolvedValue({
      ok: true,
      customer: { uid: "firebase-uid-1", email: "ana@example.test", emailVerified: true },
    });
    createQuoteRequestFromFormDataMock.mockResolvedValue({
      ok: true,
      id: "quote-123",
      quoteCode: "COT-2026-ABCDE",
    });
  });

  it("rejects quote creation without a bearer token before writing", async () => {
    const response = await POST(multipartRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      errors: { email: "Verificación de email obligatoria." },
    });
    expect(verifyCustomerIdTokenMock).not.toHaveBeenCalled();
    expect(createQuoteRequestFromFormDataMock).not.toHaveBeenCalled();
  });

  it("rejects a present blank bearer token before writing", async () => {
    verifyCustomerIdTokenMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      errors: { form: "Debes verificar tu email antes de enviar la cotización." },
    });

    const response = await POST(multipartRequest(undefined, "Bearer "));

    expect(response.status).toBe(401);
    expect(verifyCustomerIdTokenMock).toHaveBeenCalledWith(undefined);
    expect(createQuoteRequestFromFormDataMock).not.toHaveBeenCalled();
  });

  it("rejects invalid or unverified tokens before writing", async () => {
    verifyCustomerIdTokenMock.mockResolvedValue({
      ok: false,
      status: 403,
      errors: { email: "Debes usar un email verificado para enviar la cotización." },
    });

    const response = await POST(multipartRequest("unverified-token"));

    expect(response.status).toBe(403);
    expect(createQuoteRequestFromFormDataMock).not.toHaveBeenCalled();
  });

  it("passes the verified Firebase identity into quote creation", async () => {
    const response = await POST(multipartRequest("verified-token"));

    expect(response.status).toBe(201);
    expect(verifyCustomerIdTokenMock).toHaveBeenCalledWith("verified-token");
    expect(createQuoteRequestFromFormDataMock).toHaveBeenCalledWith(expect.anything(), {
      uid: "firebase-uid-1",
      email: "ana@example.test",
      emailVerified: true,
    });
    const submittedFormData = createQuoteRequestFromFormDataMock.mock.calls[0]?.[0] as FormData;
    expect(submittedFormData.get("email")).toBe("ana@example.test");
    expect(submittedFormData.has("companyWebsite")).toBe(false);
    expect(submittedFormData.has("submittedAt")).toBe(false);
  });

  it("rejects bot-like quote submissions before writing", async () => {
    const response = await POST(botMultipartRequest("verified-token"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errors: { form: "No pudimos procesar la solicitud. Intenta nuevamente." },
    });
    expect(createQuoteRequestFromFormDataMock).not.toHaveBeenCalled();
  });
});
