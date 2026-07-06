import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyCustomerIdToken } from "@/lib/auth/customer-token";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { listClientQuoteStatusesByCustomerId } from "@/lib/quotes/quote-request";
import { GET } from "./route";

vi.mock("@/lib/auth/customer-token", () => ({
  verifyCustomerIdToken: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminFirestore: vi.fn(),
}));

vi.mock("@/lib/quotes/quote-request", () => ({
  listClientQuoteStatusesByCustomerId: vi.fn(),
}));

const verifyCustomerIdTokenMock = vi.mocked(verifyCustomerIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const listClientQuoteStatusesByCustomerIdMock = vi.mocked(listClientQuoteStatusesByCustomerId);

function request(token?: string, quoteCode?: string) {
  const url = new URL("http://localhost/api/quotes/status");

  if (quoteCode) {
    url.searchParams.set("quoteCode", quoteCode);
  }

  return new Request(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

describe("authenticated quote status route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    verifyCustomerIdTokenMock.mockResolvedValue({
      ok: true,
      customer: { uid: "firebase-uid-1", email: "ana@example.test", emailVerified: true },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    listClientQuoteStatusesByCustomerIdMock.mockResolvedValue({
      ok: true,
      quotes: [{ quoteCode: "COT-2026-AAAAA", status: "pending" } as never],
    });
  });

  it("rejects requests without a bearer token", async () => {
    verifyCustomerIdTokenMock.mockResolvedValue({
      ok: false,
      status: 401,
      errors: { form: "Debes verificar tu email antes de enviar la cotización." },
    });

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(verifyCustomerIdTokenMock).toHaveBeenCalledWith(undefined);
    expect(listClientQuoteStatusesByCustomerIdMock).not.toHaveBeenCalled();
  });

  it("rejects invalid or unverified tokens", async () => {
    verifyCustomerIdTokenMock.mockResolvedValue({
      ok: false,
      status: 403,
      errors: { email: "Debes usar un email verificado para enviar la cotización." },
    });

    const response = await GET(request("unverified-token"));

    expect(response.status).toBe(403);
    expect(listClientQuoteStatusesByCustomerIdMock).not.toHaveBeenCalled();
  });

  it("loads statuses for the authenticated Firebase uid only", async () => {
    const response = await GET(request("verified-token"));

    await expect(response.json()).resolves.toEqual({
      quotes: [{ quoteCode: "COT-2026-AAAAA", status: "pending" }],
    });
    expect(response.status).toBe(200);
    expect(listClientQuoteStatusesByCustomerIdMock).toHaveBeenCalledWith(
      expect.anything(),
      "firebase-uid-1",
      undefined,
    );
  });

  it("passes quoteCode as an own-quote filter and never accepts email", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/quotes/status?quoteCode=COT-2026-BBBBB&email=otra@example.test",
        { headers: { Authorization: "Bearer verified-token" } },
      ),
    );

    expect(response.status).toBe(200);
    expect(listClientQuoteStatusesByCustomerIdMock).toHaveBeenCalledWith(
      expect.anything(),
      "firebase-uid-1",
      "COT-2026-BBBBB",
    );
  });
});
