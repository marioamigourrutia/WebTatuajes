import Link from "next/link";
import { appConfig } from "@/lib/config/app";
import { SiteHeader } from "@/lib/layout/site-header";
import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/contacto", label: "Contacto" },
  { href: "/quote", label: "Cotización" },
  { href: "/quote/status", label: "Seguimiento" },
  { href: "/opiniones", label: "Opiniones" },
  { href: "/comunidad", label: "Comunidad" },
  { href: "/colaboradores", label: "Colaboradores" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/terminos-reserva", label: "Términos de reserva" },
  { href: "/admin", label: "Panel admin" },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const whatsappUrl = hasWhatsAppConfig(appConfig.whatsappPhone)
    ? buildWhatsAppUrl({ phone: appConfig.whatsappPhone, message: appConfig.whatsappMessage })
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:48px_48px]">
      <SiteHeader navItems={navItems} whatsappUrl={whatsappUrl} />
      {children}
      <footer className="mt-auto border-t border-white/10 bg-black/80">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-9 text-sm text-zinc-500 sm:px-10 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <p className="font-semibold tracking-wide text-zinc-200">
              {appConfig.studioName} · {appConfig.artistName}
            </p>
            <p className="mt-2 max-w-2xl leading-6">
              Realismo en negro y grises, diseño personalizado y atención por agenda. Cada proyecto
              se evalúa antes de confirmar una sesión.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:justify-end">
            <Link className="text-xs hover:text-white" href="/contacto">Contacto</Link>
            <Link className="text-xs hover:text-white" href="/quote">Cotización</Link>
            <Link className="text-xs hover:text-white" href="/quote/status">Seguimiento</Link>
            <Link className="text-xs hover:text-white" href="/privacidad">Privacidad</Link>
            <Link className="text-xs hover:text-white" href="/terminos-reserva">Términos de reserva</Link>
            <Link className="text-xs hover:text-white" href="/admin">Panel admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
