import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSafeAdminInitialStatus } from "./page";
import { getServerAuthStatusFromSessionCookie } from "@/lib/auth/server";
import { isFirebaseAdminBackendConfigured } from "@/lib/config/firebase-admin";

vi.mock("@/lib/auth/admin-status-panel", () => ({
  AdminStatusPanel: () => null,
}));

vi.mock("@/lib/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/server")>();

  return {
    ...actual,
    getServerAuthStatusFromSessionCookie: vi.fn(),
  };
});

vi.mock("@/lib/config/firebase-admin", () => ({
  isFirebaseAdminBackendConfigured: vi.fn(),
}));

const getServerAuthStatusFromSessionCookieMock = vi.mocked(getServerAuthStatusFromSessionCookie);
const isFirebaseAdminBackendConfiguredMock = vi.mocked(isFirebaseAdminBackendConfigured);

describe("admin page initial status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    isFirebaseAdminBackendConfiguredMock.mockReturnValue(true);
    getServerAuthStatusFromSessionCookieMock.mockResolvedValue({
      authenticated: false,
      admin: false,
      profile: null,
    });
  });

  it("returns a safe configuration message when Firebase Admin is not configured", async () => {
    isFirebaseAdminBackendConfiguredMock.mockReturnValue(false);

    await expect(getSafeAdminInitialStatus(undefined)).resolves.toEqual({
      authenticated: false,
      admin: false,
      profile: null,
      configurationMessage:
        "Firebase Admin is not configured in this environment. Configure server-only FIREBASE_SERVICE_ACCOUNT_JSON or the complete FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY set in Vercel to enable server-side admin validation.",
    });
    expect(getServerAuthStatusFromSessionCookieMock).not.toHaveBeenCalled();
  });

  it("returns a safe configuration message when Firebase Admin initialization fails", async () => {
    getServerAuthStatusFromSessionCookieMock.mockRejectedValue(new Error("invalid credential"));

    await expect(getSafeAdminInitialStatus("session-cookie")).resolves.toEqual({
      authenticated: false,
      admin: false,
      profile: null,
      configurationMessage:
        "Firebase Admin could not initialize with the current configuration. Check that Vercel has either valid FIREBASE_SERVICE_ACCOUNT_JSON or the complete FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY set before using the admin panel.",
    });
  });
});
