import { afterEach, describe, expect, it, vi } from "vitest";
import { getAdminSessionFailureMessage, getLoginFailureMessage } from "./login-errors";

describe("admin login error messages", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("explains production credential rejection without exposing secrets", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_ENABLED", "true");

    expect(getLoginFailureMessage({ code: "auth/invalid-credential" })).toBe(
      "Firebase rechazó estas credenciales. Confirma que esta cuenta exista en Authentication > Users del mismo proyecto Firebase y que tenga contraseña configurada.",
    );
  });

  it("identifies a disabled Email/Password provider", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(getLoginFailureMessage({ code: "auth/operation-not-allowed" })).toContain(
      "Email/Password no está habilitado",
    );
  });

  it("identifies an invalid public Firebase API key", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(getLoginFailureMessage({ code: "auth/invalid-api-key" })).toContain(
      "NEXT_PUBLIC_FIREBASE_API_KEY",
    );
  });

  it("guides local admin setup when emulator credentials are missing or unseeded", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_ENABLED", "true");

    expect(getLoginFailureMessage({ code: "auth/invalid-credential" })).toContain(
      "npm run admin:seed-local",
    );
    expect(getLoginFailureMessage({ code: "auth/network-request-failed" })).toContain(
      "npm run emulators",
    );
  });

  it("guides local seed flow when server session validation fails", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_ENABLED", "true");

    expect(getAdminSessionFailureMessage("No autenticado.")).toBe(
      "No autenticado. Para usar admin@example.test en local, primero levanta los emuladores con `npm run emulators` y luego ejecuta `npm run admin:seed-local` en otra terminal.",
    );
  });
});
