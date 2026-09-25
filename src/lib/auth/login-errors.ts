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

  if (isFirebaseAuthEmulatorEnabled()) {
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

  switch (code) {
    case "auth/operation-not-allowed":
      return "Firebase rechazó el acceso porque Email/Password no está habilitado en Authentication > Sign-in method.";
    case "auth/invalid-api-key":
    case "auth/app-not-authorized":
      return "La configuración pública de Firebase no corresponde a una app autorizada. Revisa NEXT_PUBLIC_FIREBASE_API_KEY y el proyecto configurado en Vercel.";
    case "auth/user-disabled":
      return "Esta cuenta está deshabilitada en Firebase Authentication. Actívala desde Authentication > Users.";
    case "auth/too-many-requests":
      return "Firebase bloqueó temporalmente nuevos intentos por demasiadas solicitudes. Espera unos minutos antes de volver a intentar.";
    case "auth/network-request-failed":
      return "No se pudo conectar con Firebase Authentication. Revisa la conexión y vuelve a intentar.";
    case "auth/unauthorized-domain":
      return "El dominio actual no está autorizado en Firebase Authentication. Agrégalo en Authentication > Settings > Authorized domains.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Firebase rechazó estas credenciales. Confirma que esta cuenta exista en Authentication > Users del mismo proyecto Firebase y que tenga contraseña configurada.";
    default:
      return code
        ? `Firebase no pudo iniciar sesión (${code}). Revisa la configuración de Authentication del proyecto.`
        : "No se pudo iniciar sesión. Revisa la configuración de Firebase Authentication.";
  }
}

export function getAdminSessionFailureMessage(serverMessage?: string): string {
  if (!isFirebaseAuthEmulatorEnabled()) {
    return serverMessage ?? "El servidor no pudo crear una sesión admin segura.";
  }

  return `${serverMessage ?? "El servidor no pudo crear una sesión admin segura."} ${localAdminSetupMessage}`;
}
