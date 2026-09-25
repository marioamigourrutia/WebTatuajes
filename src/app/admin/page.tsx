import { cookies } from "next/headers";
import { AdminStatusPanel } from "@/lib/auth/admin-status-panel";
import { isFirebaseAdminBackendConfigured } from "@/lib/config/firebase-admin";
import { isExternalImageUploadConfigured } from "@/lib/images/upload-provider";
import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";

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
  const imageUploadsEnabled = isExternalImageUploadConfigured();

  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="A1"
          eyebrow="Administración / privado"
          title="Control del estudio."
          description="Cotizaciones, calendario, reservas, contenido, imágenes editoriales, opiniones, tienda, comunidad y auditoría en un único panel protegido."
          tone="black"
          meta={["Acceso restringido", "Firebase", "Server validated"]}
        />

        <section className="neo-admin mt-4 border border-[#cec6c2]/14 bg-[#181818] p-3 sm:p-5 lg:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#cec6c2]/14 pb-4">
            <div>
              <p className="neo-kicker">Dashboard</p>
              <h2 className="neo-display mt-3 text-[clamp(2.2rem,5vw,4rem)] text-[#cec6c2]">
                Gestión operativa
              </h2>
            </div>
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#66615e]">
              Cambios verificados en servidor
            </span>
          </div>
          <AdminStatusPanel
            imageUploadsEnabled={imageUploadsEnabled}
            initialStatus={initialStatus}
          />
        </section>
      </div>
    </main>
  );
}
