import { isFirebaseAuthEmulatorEnabled } from "@/lib/config/firebase";

const localAdminSetupMessage =
  "Para usar admin@example.test en local, primero levanta los emuladores con `npm run emulators` y luego ejecuta `npm run admin:seed-local` en otra terminal.";

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  const code = (error as { code: unknown }).code;

  return typeof code === "string" ? code : null;
}

export function getLoginFailureMessage(error: unknown): string {
  const code = getErrorCode(error);

  if (!isFirebaseAuthEmulatorEnabled()) {
    return "No se pudo iniciar sesión. Revisa el email y la contraseña.";
  }

  if (
    code === "auth/user-not-found" ||
    code === "auth/invalid-credential" ||
    code === "auth/invalid-login-credentials" ||
    code === "auth/network-request-failed"
  ) {
    return `No se pudo iniciar sesión con las credenciales locales. ${localAdminSetupMessage}`;
  }

  return "No se pudo iniciar sesión. Revisa el email, la contraseña y que los emuladores locales estén activos.";
}

export function getAdminSessionFailureMessage(serverMessage?: string): string {
  if (!isFirebaseAuthEmulatorEnabled()) {
    return serverMessage ?? "El servidor no pudo crear una sesión admin segura.";
  }

  return `${serverMessage ?? "El servidor no pudo crear una sesión admin segura."} ${localAdminSetupMessage}`;
}
