import Link from "next/link";
import { appConfig } from "@/lib/config/app";
import { SiteHeader } from "@/lib/layout/site-header";
import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/quote", label: "Cotización" },
  { href: "/quote/status", label: "Seguimiento" },
  { href: "/opiniones", label: "Opiniones" },
  { href: "/comunidad", label: "Comunidad" },
  { href: "/colaboradores", label: "Colaboradores" },
  { href: "/contacto", label: "Contacto" },
  { href: "/admin", label: "Admin" },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const whatsappUrl = hasWhatsAppConfig(appConfig.whatsappPhone)
    ? buildWhatsAppUrl({ phone: appConfig.whatsappPhone, message: appConfig.whatsappMessage })
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader navItems={navItems} whatsappUrl={whatsappUrl} />
      {children}
      <footer className="mt-auto border-t border-[#cec6c2]/15 bg-[#141414]">
        <div className="mx-auto w-full max-w-[1500px] px-5 py-12 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="neo-kicker">Tattoo studio</p>
              <p className="neo-display mt-5 max-w-4xl text-[clamp(2.5rem,7vw,6.5rem)] leading-[0.86] text-[#cec6c2]">
                {appConfig.brandName}
              </p>
              <p className="mt-6 max-w-xl text-sm leading-7 text-[#837f7c]">
                Realismo black & grey, diseño personalizado y una experiencia de reserva clara de principio a fin.
              </p>
            </div>

            <div className="grid gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#837f7c] sm:grid-cols-2 lg:text-right">
              <a className="transition hover:text-[#cec6c2]" href={appConfig.instagramUrl} rel="noreferrer" target="_blank">Instagram ↗</a>
              <Link className="transition hover:text-[#cec6c2]" href="/contacto">Contacto</Link>
              <Link className="transition hover:text-[#cec6c2]" href="/quote">Cotización</Link>
              <Link className="transition hover:text-[#cec6c2]" href="/quote/status">Seguimiento</Link>
              <Link className="transition hover:text-[#cec6c2]" href="/privacidad">Privacidad</Link>
              <Link className="transition hover:text-[#cec6c2]" href="/terminos-reserva">Términos</Link>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-[#cec6c2]/10 pt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#66615e] sm:flex-row sm:items-center sm:justify-between">
            <span>Programado por Mario Amigo Urrutia · Derechos de uso reservados.</span>
            <span>Chile / {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
