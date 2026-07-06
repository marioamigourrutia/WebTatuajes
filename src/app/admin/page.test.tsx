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
        "Firebase Admin no está configurado en este entorno. Configura FIREBASE_SERVICE_ACCOUNT_JSON en Vercel para habilitar la validación server-side del panel admin.",
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
        "No se pudo inicializar Firebase Admin con la configuración actual. Revisa FIREBASE_SERVICE_ACCOUNT_JSON en Vercel antes de usar el panel admin.",
    });
  });
});
