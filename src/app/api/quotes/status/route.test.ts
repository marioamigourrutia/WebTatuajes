import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { getClientQuoteStatusByCode } from "@/lib/quotes/quote-request";
import { resetRateLimitForTests } from "@/lib/rate-limit";
import { GET } from "./route";

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminFirestore: vi.fn(),
}));

vi.mock("@/lib/quotes/quote-request", () => ({
  getClientQuoteStatusByCode: vi.fn(),
}));

const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const getClientQuoteStatusByCodeMock = vi.mocked(getClientQuoteStatusByCode);

function request(quoteCode?: string, email?: string) {
  const url = new URL("http://localhost/api/quotes/status");

  if (quoteCode) {
    url.searchParams.set("quoteCode", quoteCode);
  }

  if (email) {
    url.searchParams.set("email", email);
  }

  return new Request(url);
}

describe("public quote status route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetRateLimitForTests();
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    getClientQuoteStatusByCodeMock.mockResolvedValue({
      ok: true,
      quote: { quoteCode: "COT-2026-AAAAA", status: "pending" } as never,
    });
  });

  it("rejects requests without the quote code and email pair", async () => {
    getClientQuoteStatusByCodeMock.mockResolvedValue({
      ok: false,
      status: 400,
      error:
        "No pudimos validar la solicitud con esos datos. Revisa el código y el email ingresados o contacta al estudio.",
    });

    const response = await GET(request());

    expect(response.status).toBe(400);
    expect(getClientQuoteStatusByCodeMock).toHaveBeenCalledWith(expect.anything(), undefined, undefined);
  });

  it("loads a public quote status with quote code and matching email", async () => {
    const response = await GET(request("COT-2026-AAAAA", "ana@example.test"));

    await expect(response.json()).resolves.toEqual({
      quotes: [{ quoteCode: "COT-2026-AAAAA", status: "pending" }],
    });
    expect(response.status).toBe(200);
    expect(getClientQuoteStatusByCodeMock).toHaveBeenCalledWith(
      expect.anything(),
      "COT-2026-AAAAA",
      "ana@example.test",
    );
  });

  it("uses email only as the existing anti-spoofing lookup key", async () => {
    const response = await GET(
      new Request("http://localhost/api/quotes/status?quoteCode=COT-2026-BBBBB&email=otra@example.test"),
    );

    expect(response.status).toBe(200);
    expect(getClientQuoteStatusByCodeMock).toHaveBeenCalledWith(
      expect.anything(),
      "COT-2026-BBBBB",
      "otra@example.test",
    );
  });
});
