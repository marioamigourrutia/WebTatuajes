import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { verifyCustomerIdToken } from "./customer-token";

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminAuth: vi.fn(),
}));

const getFirebaseAdminAuthMock = vi.mocked(getFirebaseAdminAuth);

describe("customer token verification", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects missing tokens", async () => {
    await expect(verifyCustomerIdToken(undefined)).resolves.toMatchObject({
      ok: false,
      status: 401,
    });
    expect(getFirebaseAdminAuthMock).not.toHaveBeenCalled();
  });

  it("rejects invalid tokens", async () => {
    getFirebaseAdminAuthMock.mockReturnValue({
      verifyIdToken: vi.fn().mockRejectedValue(new Error("invalid token")),
    } as never);

    await expect(verifyCustomerIdToken("bad-token")).resolves.toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("rejects tokens without a verified email", async () => {
    getFirebaseAdminAuthMock.mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({
        uid: "firebase-uid-1",
        email: "ana@example.test",
        email_verified: false,
      }),
    } as never);

    await expect(verifyCustomerIdToken("id-token")).resolves.toMatchObject({
      ok: false,
      status: 403,
    });
  });

  it("rejects verified tokens without an email", async () => {
    getFirebaseAdminAuthMock.mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({
        uid: "firebase-uid-1",
        email_verified: true,
      }),
    } as never);

    await expect(verifyCustomerIdToken("id-token")).resolves.toMatchObject({
      ok: false,
      status: 403,
    });
  });

  it("returns the verified Firebase customer identity", async () => {
    getFirebaseAdminAuthMock.mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({
        uid: "firebase-uid-1",
        email: "ANA@EXAMPLE.TEST ",
        email_verified: true,
      }),
    } as never);

    await expect(verifyCustomerIdToken("id-token")).resolves.toEqual({
      ok: true,
      customer: { uid: "firebase-uid-1", email: "ana@example.test", emailVerified: true },
    });
  });
});
