import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyCustomerIdToken } from "@/lib/auth/customer-token";
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

function multipartRequest(token?: string) {
  const formData = new FormData();
  formData.set("email", "ana@example.test");

  return new Request("http://localhost/api/quotes", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
}

describe("quote creation route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

  it("rejects quote creation without a bearer token", async () => {
    verifyCustomerIdTokenMock.mockResolvedValue({
      ok: false,
      status: 401,
      errors: { form: "Debes verificar tu email antes de enviar la cotización." },
    });

    const response = await POST(multipartRequest());

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
  });
});
