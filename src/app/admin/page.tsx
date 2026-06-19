import { cookies } from "next/headers";
import { AdminStatusPanel } from "@/lib/auth/admin-status-panel";
import { adminSessionCookieName, getServerAuthStatusFromSessionCookie } from "@/lib/auth/server";
import { isFirebaseAdminBackendConfigured } from "@/lib/config/firebase-admin";

const unauthenticatedAdminStatus = {
  authenticated: false,
  admin: false,
  profile: null,
};

export async function getSafeAdminInitialStatus(sessionCookie: string | undefined) {
  if (!isFirebaseAdminBackendConfigured()) {
    return {
      ...unauthenticatedAdminStatus,
      configurationMessage:
        "Firebase Admin no está configurado en este entorno. Configura FIREBASE_SERVICE_ACCOUNT_JSON en Vercel para habilitar la validación server-side del panel admin.",
    };
  }

  try {
    return await getServerAuthStatusFromSessionCookie(sessionCookie);
  } catch {
    return {
      ...unauthenticatedAdminStatus,
      configurationMessage:
        "No se pudo inicializar Firebase Admin con la configuración actual. Revisa FIREBASE_SERVICE_ACCOUNT_JSON en Vercel antes de usar el panel admin.",
    };
  }
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const initialStatus = await getSafeAdminInitialStatus(
    cookieStore.get(adminSessionCookieName)?.value,
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col px-6 py-10">
      <AdminStatusPanel initialStatus={initialStatus} />
    </main>
  );
}
