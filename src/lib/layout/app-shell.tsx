import Link from "next/link";
import { appConfig } from "@/lib/config/app";
import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/portfolio", label: "Portafolio" },
  { href: "/quote", label: "Cotizar" },
  { href: "/admin", label: "Admin" },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const whatsappUrl = hasWhatsAppConfig(appConfig.whatsappPhone)
    ? buildWhatsAppUrl({ phone: appConfig.whatsappPhone, message: appConfig.whatsappMessage })
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-stone-800/80 bg-stone-950/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 sm:px-10 md:flex-row md:items-center md:justify-between">
          <Link
            className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300"
            href="/"
          >
            WebTatuajes
          </Link>
          <nav aria-label="Navegación principal" className="flex flex-wrap items-center gap-3">
            {navItems.map((item) => (
              <Link
                className="rounded-full px-3 py-2 text-sm font-medium text-stone-200 transition hover:bg-stone-800 hover:text-stone-50"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
            {whatsappUrl ? (
              <a
                className="rounded-full border border-amber-300/50 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950"
                href={whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                WhatsApp
              </a>
            ) : null}
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-stone-800/80 bg-stone-950/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-5 text-sm text-stone-400 sm:px-10 md:flex-row md:items-center md:justify-between">
          <p>Estudio profesional de tatuajes · Cotizaciones privadas y atención por agenda.</p>
          <p>Entorno local MVP: sin pagos, CMS de portafolio ni credenciales reales.</p>
        </div>
      </footer>
    </div>
  );
}
