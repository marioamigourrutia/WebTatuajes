import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { createReviewToken } from "@/lib/reviews/review";

vi.mock("@/lib/auth/bearer", () => ({ getBearerToken: vi.fn(() => "id-token") }));
vi.mock("@/lib/auth/server", () => ({ getServerAuthStatusFromIdToken: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({ getFirebaseAdminFirestore: vi.fn() }));
vi.mock("@/lib/reviews/review", () => ({ createReviewToken: vi.fn() }));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const createReviewTokenMock = vi.mocked(createReviewToken);

describe("admin review token route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    createReviewTokenMock.mockResolvedValue({
      ok: true,
      token: "raw-secret",
      tokenHash: "hash",
      link: "http://localhost/opiniones/enviar?token=raw-secret",
    });
  });

  it("requires admin auth for token generation", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: false,
      admin: false,
      profile: null,
    });

    const response = await POST(
      new Request("http://localhost/api/admin/reviews/tokens", { method: "POST", body: "{}" }),
    );

    expect(response.status).toBe(401);
    expect(createReviewTokenMock).not.toHaveBeenCalled();
  });

  it("returns the generated link but not the raw token as a separate field", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/reviews/tokens", {
        method: "POST",
        body: JSON.stringify({ customerEmail: "client@example.test" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      link: "http://localhost/opiniones/enviar?token=raw-secret",
      tokenHash: "hash",
    });
    expect(body.token).toBeUndefined();
  });
});
