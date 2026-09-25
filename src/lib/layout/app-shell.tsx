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
  { href: "/terminos-reserva", label: "Términos" },
  { href: "/admin", label: "Panel admin" },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const whatsappUrl = hasWhatsAppConfig(appConfig.whatsappPhone)
    ? buildWhatsAppUrl({ phone: appConfig.whatsappPhone, message: appConfig.whatsappMessage })
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader navItems={navItems} whatsappUrl={whatsappUrl} />
      {children}

      <footer className="mt-auto pt-12 sm:pt-20">
        <section className="relative overflow-hidden border-y border-[#cec6c2]/20 bg-[#370803] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 whitespace-nowrap text-center font-[var(--font-display)] text-[clamp(7rem,20vw,21rem)] uppercase leading-[0.82] tracking-[-0.02em] text-[#cec6c2]/90"
            aria-hidden="true"
          >
            Agenda
          </div>

          <div className="relative mx-auto flex min-h-[21rem] w-full max-w-5xl items-center justify-center">
            <div className="w-full border border-[#cec6c2]/22 bg-[#141414] px-5 py-8 text-center sm:px-10 sm:py-10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b7aaa4]">
                ¿Tienes una idea? Hablemos.
              </p>
              <div className="mt-5 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <span className="neo-display text-[clamp(3.3rem,9vw,7.4rem)] text-[#cec6c2]">
                  Contacto
                </span>
                <Link
                  aria-label="Ir a contacto"
                  className="grid h-14 w-14 shrink-0 place-items-center border border-[#cec6c2] bg-[#cec6c2] text-2xl text-[#141414] transition hover:-translate-y-1"
                  href="/contacto"
                >
                  →
                </Link>
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#837f7c]">
                <Link className="transition hover:text-[#cec6c2]" href="/quote">Cotización</Link>
                <Link className="transition hover:text-[#cec6c2]" href="/quote/status">Seguimiento</Link>
                <Link className="transition hover:text-[#cec6c2]" href="/privacidad">Privacidad</Link>
                <Link className="transition hover:text-[#cec6c2]" href="/terminos-reserva">Términos</Link>
                <a className="transition hover:text-[#cec6c2]" href={appConfig.instagramUrl} rel="noreferrer" target="_blank">Instagram ↗</a>
              </div>
            </div>
          </div>
        </section>

        <div className="border-b border-[#cec6c2]/10 bg-[#101010]">
          <div className="mx-auto flex w-full max-w-[1536px] flex-col gap-3 px-4 py-5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#66615e] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span>Programado por Mario Amigo Urrutia · Derechos de uso reservados.</span>
            <span>{appConfig.brandName} · Chile · {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
