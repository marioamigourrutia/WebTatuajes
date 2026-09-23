"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { appConfig } from "@/lib/config/app";

type NavItem = { href: string; label: string };
type SiteHeaderProps = { navItems: NavItem[]; whatsappUrl: string | null };

const navLinkClassName =
  "rounded-full px-3 py-2 text-[13px] font-medium text-zinc-300 transition hover:bg-white/8 hover:text-white";

export function SiteHeader({ navItems, whatsappUrl }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const mobileMenuId = useId();
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/88 shadow-[0_18px_45px_rgba(0,0,0,0.32)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link className="group flex min-w-0 items-center gap-3" href="/" onClick={closeMenu}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-zinc-100 to-zinc-500 text-sm font-black text-black shadow-[0_0_30px_rgba(255,255,255,0.08)] transition group-hover:border-white/40">
            HT
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold uppercase tracking-[0.24em] text-zinc-100">
              {appConfig.studioName}
            </span>
            <span className="mt-1 block truncate text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Realismo black & grey · {appConfig.artistName}
            </span>
          </span>
        </Link>

        <nav aria-label="Navegación principal" className="hidden flex-1 flex-wrap items-center justify-end gap-1 xl:flex">
          {navItems.map((item) => (
            <Link className={navLinkClassName} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          {whatsappUrl ? (
            <a
              className="ml-1 rounded-full border border-white/20 bg-white px-4 py-2 text-[13px] font-semibold text-black transition hover:bg-zinc-200"
              href={whatsappUrl}
              rel="noreferrer"
              target="_blank"
            >
              WhatsApp
            </a>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-2 xl:hidden">
          {whatsappUrl ? (
            <a
              className="hidden rounded-full border border-white/20 bg-white px-3 py-2 text-xs font-semibold text-black sm:inline-flex"
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-zinc-950 text-zinc-100 transition hover:border-white/35"
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
        <div className="border-t border-white/10 bg-black/95 px-4 pb-4 shadow-2xl xl:hidden">
          <nav aria-label="Menú móvil" className="mx-auto grid w-full max-w-7xl gap-2 pt-3" id={mobileMenuId}>
            {navItems.map((item) => (
              <Link
                className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-white/30 hover:bg-zinc-900"
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
