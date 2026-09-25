"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { appConfig } from "@/lib/config/app";

type NavItem = { href: string; label: string };
type SiteHeaderProps = { navItems: NavItem[]; whatsappUrl: string | null };

const navLinkClassName =
  "whitespace-nowrap border-b border-transparent px-2 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400 transition hover:border-[#cfff19] hover:text-[#cfff19]";

export function SiteHeader({ navItems, whatsappUrl }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const mobileMenuId = useId();
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#cfff19]/15 bg-[#050505]/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-5 px-4 py-3 sm:px-6 lg:px-8">
        <Link className="group flex min-w-0 shrink-0 items-center gap-3" href="/" onClick={closeMenu}>
          <span className="grid h-10 w-10 shrink-0 place-items-center border border-[#cfff19] bg-[#cfff19] text-[10px] font-black tracking-[-0.06em] text-black shadow-[0_0_24px_rgba(207,255,25,0.10)] transition group-hover:shadow-[0_0_28px_rgba(207,255,25,0.20)]">
            MAT
          </span>
          <span className="min-w-0">
            <span className="neo-display block truncate text-[15px] leading-none text-zinc-100">
              {appConfig.brandName}
            </span>
            <span className="mt-1 hidden truncate font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#cfff19]/80 sm:block">
              Tattoo studio / Chile
            </span>
          </span>
        </Link>

        <nav aria-label="Navegación principal" className="hidden min-w-0 flex-1 items-center justify-end gap-2 2xl:flex">
          {navItems.map((item) => (
            <Link className={navLinkClassName} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          {whatsappUrl ? (
            <a className="neo-button ml-3 !min-h-10 !px-4 !py-2" href={whatsappUrl} rel="noreferrer" target="_blank">
              WhatsApp ↗
            </a>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-2 2xl:hidden">
          {whatsappUrl ? (
            <a className="neo-button hidden !min-h-10 !px-4 !py-2 sm:inline-flex" href={whatsappUrl} rel="noreferrer" target="_blank">
              WhatsApp ↗
            </a>
          ) : null}
          <button
            aria-controls={mobileMenuId}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Cerrar menú principal" : "Abrir menú principal"}
            className="inline-flex h-10 w-10 items-center justify-center border border-[#cfff19]/40 bg-[#0b0b0b] text-[#cfff19] transition hover:border-[#cfff19]"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <span aria-hidden="true" className="grid gap-1.5">
              <span className="block h-px w-5 bg-current" />
              <span className="block h-px w-5 bg-current" />
              <span className="block h-px w-5 bg-current" />
            </span>
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-[#cfff19]/15 bg-[#050505]/98 px-4 pb-5 shadow-2xl 2xl:hidden">
          <nav aria-label="Menú móvil" className="mx-auto grid w-full max-w-7xl gap-2 pt-3 sm:grid-cols-2" id={mobileMenuId}>
            {navItems.map((item, index) => (
              <Link
                className="group flex items-center justify-between border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-zinc-200 transition hover:border-[#cfff19]/60 hover:text-[#cfff19]"
                href={item.href}
                key={item.href}
                onClick={closeMenu}
              >
                <span>{item.label}</span>
                <span className="font-mono text-[10px] text-[#cfff19]/60">{String(index + 1).padStart(2, "0")}</span>
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
