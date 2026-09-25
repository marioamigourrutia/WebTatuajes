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
    <div className="flex min-h-screen flex-col bg-[linear-gradient(rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:72px_72px]">
      <SiteHeader navItems={navItems} whatsappUrl={whatsappUrl} />
      {children}
      <footer className="mt-auto border-t border-white/10 bg-[#050505]">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-10 text-sm sm:px-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-black uppercase tracking-[0.18em] text-zinc-100">{appConfig.brandName}</p>
            <p className="mt-3 max-w-xl leading-6 text-zinc-500">
              Realismo black & grey · trabajo personalizado · atención con agenda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 md:max-w-xl md:justify-end">
            <a className="text-xs font-semibold text-zinc-400 transition hover:text-white" href={appConfig.instagramUrl} rel="noreferrer" target="_blank">Instagram</a>
            <Link className="text-xs font-semibold text-zinc-400 transition hover:text-white" href="/contacto">Contacto</Link>
            <Link className="text-xs font-semibold text-zinc-400 transition hover:text-white" href="/quote">Cotización</Link>
            <Link className="text-xs font-semibold text-zinc-400 transition hover:text-white" href="/quote/status">Seguimiento</Link>
            <Link className="text-xs font-semibold text-zinc-400 transition hover:text-white" href="/privacidad">Privacidad</Link>
            <Link className="text-xs font-semibold text-zinc-400 transition hover:text-white" href="/terminos-reserva">Términos</Link>
            <Link className="text-xs font-semibold text-zinc-500 transition hover:text-white" href="/admin">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
