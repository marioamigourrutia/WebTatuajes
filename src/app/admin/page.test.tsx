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
        "El panel administrativo no está conectado al backend en este entorno. Revisa las variables server-only de Firebase Admin en Vercel.",
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
        "No pudimos validar la sesión administrativa en este entorno. Revisa la configuración de Firebase Admin en Vercel.",
    });
  });
});
