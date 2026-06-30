import Link from "next/link";
import { appConfig } from "@/lib/config/app";
import { SiteHeader } from "@/lib/layout/site-header";
import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/portfolio", label: "Portafolio" },
  { href: "/colaboradores", label: "Colaboradores" },
  { href: "/opiniones", label: "Opiniones" },
  { href: "/tienda", label: "Tienda" },
  { href: "/contacto", label: "Contacto" },
  { href: "/quote", label: "Cotizar" },
];

const globalWhatsAppPhone = "+56 9 7761 6917";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const whatsappUrl = hasWhatsAppConfig(globalWhatsAppPhone)
    ? buildWhatsAppUrl({ phone: globalWhatsAppPhone, message: appConfig.whatsappMessage })
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:42px_42px]">
      <SiteHeader navItems={navItems} whatsappUrl={whatsappUrl} />
      {children}
      <footer className="mt-auto border-t border-amber-100/10 bg-stone-950/80">
        <div className="mx-auto grid w-full max-w-6xl gap-5 px-6 py-8 text-sm text-stone-400 sm:px-10 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <p className="font-semibold text-stone-200">
              {appConfig.studioName} · {appConfig.artistName}
            </p>
            <p className="mt-2 max-w-2xl leading-6">
              Diseño personalizado, evaluación responsable y comunicación clara. Cotizaciones
              privadas, atención por agenda y coordinación directa por WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <Link
              className="text-xs text-stone-500 underline-offset-4 hover:text-stone-300 hover:underline"
              href="/tienda"
            >
              Obras disponibles
            </Link>
            <Link
              className="text-xs text-stone-500 underline-offset-4 hover:text-stone-300 hover:underline"
              href="/admin"
            >
              Administración
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
