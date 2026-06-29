import Link from "next/link";
import { appConfig } from "@/lib/config/app";
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
      <header className="sticky top-0 z-40 border-b border-amber-100/10 bg-stone-950/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
          <Link className="group flex items-center gap-3" href="/">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-300/40 bg-amber-300/10 text-sm font-black text-amber-200 shadow-lg shadow-amber-950/30 transition group-hover:border-amber-200">
              HT
            </span>
            <span>
              <span className="block text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
                {appConfig.studioName}
              </span>
              <span className="mt-1 block text-xs text-stone-400">{appConfig.artistName}</span>
            </span>
          </Link>
          <nav
            aria-label="Navegación principal"
            className="flex flex-wrap items-center gap-1 sm:gap-2"
          >
            {navItems.map((item) => (
              <Link
                className="rounded-full px-2.5 py-2 text-sm font-medium text-stone-200 transition hover:bg-stone-800/90 hover:text-stone-50 sm:px-3"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
            {whatsappUrl ? (
              <a
                className="rounded-full border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100 shadow-sm shadow-amber-950/30 transition hover:bg-amber-300 hover:text-stone-950 sm:px-4"
                href={whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                WhatsApp +56 9 7761 6917
              </a>
            ) : null}
          </nav>
        </div>
      </header>
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
