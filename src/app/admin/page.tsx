import { AdminStatusPanel } from "@/lib/auth/admin-status-panel";
import { isFirebaseAdminBackendConfigured } from "@/lib/config/firebase-admin";
import { isExternalImageUploadConfigured } from "@/lib/images/upload-config";
import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unauthenticatedAdminStatus = {
  authenticated: false,
  admin: false,
  profile: null,
};

export async function getSafeAdminInitialStatus() {
  if (!isFirebaseAdminBackendConfigured()) {
    return {
      ...unauthenticatedAdminStatus,
      configurationMessage:
        "El panel administrativo no está conectado al backend en este entorno. Revisa las variables server-only de Firebase Admin en Vercel.",
    };
  }

  // El contenido administrativo nunca se restaura solamente desde una cookie antigua.
  // El usuario debe autenticarse con Firebase Auth en el navegador y el servidor vuelve
  // a validar su rol antes de habilitar cualquier módulo o escritura administrativa.
  return unauthenticatedAdminStatus;
}

export default async function AdminPage() {
  const backendConfigured = isFirebaseAdminBackendConfigured();
  const imageUploadsEnabled = isExternalImageUploadConfigured();
  const initialStatus = await getSafeAdminInitialStatus();

  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="A1"
          eyebrow="Administración · acceso privado"
          title="Control del estudio."
          description="Cotizaciones, calendario, reservas, contenido, imágenes editoriales, opiniones, tienda, comunidad y auditoría en un único panel protegido."
          tone="black"
          meta={["Acceso restringido", "Firebase", "Validación en servidor"]}
        />

        <section className="neo-admin mt-4 border border-[#cec6c2]/14 bg-[#181818] p-3 sm:p-5 lg:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#cec6c2]/14 pb-4">
            <div>
              <p className="neo-kicker">Panel</p>
              <h2 className="neo-display mt-3 text-[clamp(2.2rem,5vw,4rem)] text-[#cec6c2]">
                Gestión operativa
              </h2>
            </div>
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#66615e]">
              Cambios verificados en servidor
            </span>
          </div>

          <div className="mb-5 grid gap-px border border-[#cec6c2]/14 bg-[#cec6c2]/14 sm:grid-cols-2">
            <div className="bg-[#181818] p-4">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#66615e]">
                Firebase Admin
              </p>
              <p
                className={`mt-2 text-sm font-semibold ${backendConfigured ? "text-emerald-300" : "text-amber-200"}`}
              >
                {backendConfigured ? "Conectado" : "Configuración pendiente en Vercel"}
              </p>
            </div>
            <div className="bg-[#181818] p-4">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#66615e]">
                Biblioteca de imágenes
              </p>
              <p
                className={`mt-2 text-sm font-semibold ${imageUploadsEnabled ? "text-emerald-300" : "text-amber-200"}`}
              >
                {imageUploadsEnabled
                  ? "Subida directa habilitada"
                  : "Usa URL pública o configura ImageKit"}
              </p>
            </div>
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
