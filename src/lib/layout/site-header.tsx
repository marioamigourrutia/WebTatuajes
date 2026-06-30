"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { appConfig } from "@/lib/config/app";

type NavItem = {
  href: string;
  label: string;
};

type SiteHeaderProps = {
  navItems: NavItem[];
  whatsappUrl: string | null;
};

const brandLinkClassName = "group flex min-w-0 items-center gap-3";
const navLinkClassName =
  "rounded-full px-2.5 py-2 text-sm font-medium text-stone-200 transition hover:bg-stone-800/90 hover:text-stone-50 sm:px-3";
const desktopCtaClassName =
  "rounded-full border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100 shadow-sm shadow-amber-950/30 transition hover:bg-amber-300 hover:text-stone-950 sm:px-4";

export function SiteHeader({ navItems, whatsappUrl }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const mobileMenuId = useId();

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-amber-100/10 bg-stone-950/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <Link className={brandLinkClassName} href="/" onClick={closeMenu}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-300/40 bg-amber-300/10 text-sm font-black text-amber-200 shadow-lg shadow-amber-950/30 transition group-hover:border-amber-200">
            HT
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold uppercase tracking-[0.22em] text-amber-300 sm:tracking-[0.3em]">
              {appConfig.studioName}
            </span>
            <span className="mt-1 block truncate text-xs text-stone-400">
              {appConfig.artistName}
            </span>
          </span>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="hidden flex-wrap items-center gap-1 lg:flex"
        >
          {navItems.map((item) => (
            <Link className={navLinkClassName} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          {whatsappUrl ? (
            <a className={desktopCtaClassName} href={whatsappUrl} rel="noreferrer" target="_blank">
              WhatsApp +56 9 7761 6917
            </a>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          {whatsappUrl ? (
            <a
              aria-label="Contactar por WhatsApp"
              className="rounded-full border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100 shadow-sm shadow-amber-950/30 transition hover:bg-amber-300 hover:text-stone-950"
              href={whatsappUrl}
              rel="noreferrer"
              target="_blank"
            >
              WhatsApp
            </a>
          ) : null}
          <button
            aria-controls={mobileMenuId}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Cerrar menú principal" : "Abrir menú principal"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-700 bg-stone-900 text-stone-100 shadow-sm shadow-stone-950/30 transition hover:border-amber-300/70 hover:text-amber-100"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <span aria-hidden="true" className="grid gap-1.5">
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
            </span>
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-amber-100/10 bg-stone-950/95 px-4 pb-4 shadow-2xl shadow-stone-950/50 lg:hidden">
          <nav
            aria-label="Menú móvil"
            className="mx-auto grid w-full max-w-6xl gap-2 pt-3"
            id={mobileMenuId}
          >
            {navItems.map((item) => (
              <Link
                className="rounded-2xl border border-stone-800 bg-stone-900/70 px-4 py-3 text-sm font-medium text-stone-100 transition hover:border-amber-300/50 hover:bg-stone-800"
                href={item.href}
                key={item.href}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
