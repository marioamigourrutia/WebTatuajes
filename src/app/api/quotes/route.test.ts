import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitForTests } from "@/lib/rate-limit";
import { createQuoteRequestFromFormData } from "@/lib/quotes/quote-request";
import { POST } from "./route";

vi.mock("@/lib/quotes/quote-request", () => ({
  createQuoteRequestFromFormData: vi.fn(),
  createQuoteRequest: vi.fn(),
}));

const createQuoteRequestFromFormDataMock = vi.mocked(createQuoteRequestFromFormData);

function multipartRequest() {
  const formData = new FormData();
  formData.set("email", "ana@example.test");
  formData.set("companyWebsite", "");
  formData.set("submittedAt", String(Date.now() - 3000));

  return new Request("http://localhost/api/quotes", {
    method: "POST",
    body: formData,
  });
}

function botMultipartRequest() {
  const formData = new FormData();
  formData.set("email", "ana@example.test");
  formData.set("companyWebsite", "https://spam.test");
  formData.set("submittedAt", String(Date.now() - 3000));

  return new Request("http://localhost/api/quotes", {
    method: "POST",
    body: formData,
  });
}

describe("quote creation route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetRateLimitForTests();
    createQuoteRequestFromFormDataMock.mockResolvedValue({
      ok: true,
      id: "quote-123",
      quoteCode: "COT-2026-ABCDE",
      whatsappMessage: "Hola, código COT-2026-ABCDE",
    });
  });

  it("accepts public quote creation without a bearer token", async () => {
    const response = await POST(multipartRequest());

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      quoteCode: "COT-2026-ABCDE",
      whatsappMessage: "Hola, código COT-2026-ABCDE",
    });
    expect(createQuoteRequestFromFormDataMock).toHaveBeenCalledWith(expect.anything());
    const submittedFormData = createQuoteRequestFromFormDataMock.mock.calls[0]?.[0] as FormData;
    expect(submittedFormData.get("email")).toBe("ana@example.test");
    expect(submittedFormData.has("companyWebsite")).toBe(false);
    expect(submittedFormData.has("submittedAt")).toBe(false);
  });

  it("rejects bot-like quote submissions before writing", async () => {
    const response = await POST(botMultipartRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errors: { form: "No pudimos procesar la solicitud. Intenta nuevamente." },
    });
    expect(createQuoteRequestFromFormDataMock).not.toHaveBeenCalled();
  });
});
