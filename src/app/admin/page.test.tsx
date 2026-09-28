import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSafeAdminInitialStatus } from "./page";
import { isFirebaseAdminBackendConfigured } from "@/lib/config/firebase-admin";

vi.mock("@/lib/auth/admin-status-panel", () => ({
  AdminStatusPanel: () => null,
}));

vi.mock("@/lib/config/firebase-admin", () => ({
  isFirebaseAdminBackendConfigured: vi.fn(),
}));

const isFirebaseAdminBackendConfiguredMock = vi.mocked(isFirebaseAdminBackendConfigured);

describe("admin page initial status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    isFirebaseAdminBackendConfiguredMock.mockReturnValue(true);
  });

  it("returns a safe configuration message when Firebase Admin is not configured", async () => {
    isFirebaseAdminBackendConfiguredMock.mockReturnValue(false);

    await expect(getSafeAdminInitialStatus()).resolves.toEqual({
      authenticated: false,
      admin: false,
      profile: null,
      configurationMessage:
        "El panel administrativo no está conectado al backend en este entorno. Revisa las variables server-only de Firebase Admin en Vercel.",
    });
  });

  it("starts locked even when the backend is configured", async () => {
    await expect(getSafeAdminInitialStatus()).resolves.toEqual({
      authenticated: false,
      admin: false,
      profile: null,
    });
  });
});
