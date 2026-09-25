import { cookies } from "next/headers";
import { AdminStatusPanel } from "@/lib/auth/admin-status-panel";
import { isFirebaseAdminBackendConfigured } from "@/lib/config/firebase-admin";

const adminSessionCookieName = "webtatuajes_admin_session";

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
        "El panel administrativo no está conectado al backend en este entorno. Revisa las variables server-only de Firebase Admin en Vercel.",
    };
  }

  try {
    const { getServerAuthStatusFromSessionCookie } = await import("@/lib/auth/server");
    return await getServerAuthStatusFromSessionCookie(sessionCookie);
  } catch {
    return {
      ...unauthenticatedAdminStatus,
      configurationMessage:
        "No pudimos validar la sesión administrativa en este entorno. Revisa la configuración de Firebase Admin en Vercel.",
    };
  }
}

export default async function AdminPage() {
  let sessionCookie: string | undefined;

  try {
    const cookieStore = await cookies();
    sessionCookie = cookieStore.get(adminSessionCookieName)?.value;
  } catch {
    sessionCookie = undefined;
  }

  const initialStatus = await getSafeAdminInitialStatus(sessionCookie);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col px-4 py-10 sm:px-6">
      <AdminStatusPanel imageUploadsEnabled={false} initialStatus={initialStatus} />
    </main>
  );
}
