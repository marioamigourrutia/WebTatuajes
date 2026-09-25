"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { appConfig } from "@/lib/config/app";

type NavItem = { href: string; label: string };
type SiteHeaderProps = { navItems: NavItem[]; whatsappUrl: string | null };

const navLinkClassName =
  "whitespace-nowrap rounded-full px-2.5 py-2 text-[12px] font-semibold text-zinc-400 transition hover:bg-white/[0.055] hover:text-zinc-100";

const actionClassName =
  "whitespace-nowrap rounded-full border border-white/18 bg-[#111113] px-4 py-2 text-[12px] font-bold text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition hover:border-white/35 hover:bg-zinc-900";

export function SiteHeader({ navItems, whatsappUrl }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const mobileMenuId = useId();
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/96 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-5 px-4 py-3 sm:px-6 lg:px-8">
        <Link className="group flex min-w-0 shrink-0 items-center gap-3" href="/" onClick={closeMenu}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-zinc-700 via-zinc-300 to-zinc-700 text-[10px] font-black tracking-[-0.04em] text-black shadow-[0_0_24px_rgba(255,255,255,0.045)] transition group-hover:border-white/40">
            MAT
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-black uppercase tracking-[0.18em] text-zinc-100">
              {appConfig.brandName}
            </span>
            <span className="mt-0.5 hidden truncate text-[10px] font-semibold uppercase tracking-[0.17em] text-zinc-500 sm:block">
              Realismo black & grey
            </span>
          </span>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="hidden min-w-0 flex-1 items-center justify-end gap-0.5 2xl:flex"
        >
          {navItems.map((item) => (
            <Link className={navLinkClassName} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          {whatsappUrl ? (
            <a className={`ml-2 ${actionClassName}`} href={whatsappUrl} rel="noreferrer" target="_blank">
              WhatsApp
            </a>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-2 2xl:hidden">
          {whatsappUrl ? (
            <a className={`hidden sm:inline-flex ${actionClassName}`} href={whatsappUrl} rel="noreferrer" target="_blank">
              WhatsApp
            </a>
          ) : null}
          <button
            aria-controls={mobileMenuId}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Cerrar menú principal" : "Abrir menú principal"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#0d0d0f] text-zinc-100 transition hover:border-white/30 hover:bg-zinc-900"
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
        <div className="border-t border-white/10 bg-[#050505]/98 px-4 pb-5 shadow-2xl 2xl:hidden">
          <nav
            aria-label="Menú móvil"
            className="mx-auto grid w-full max-w-7xl gap-1.5 pt-3 sm:grid-cols-2"
            id={mobileMenuId}
          >
            {navItems.map((item) => (
              <Link
                className="rounded-xl border border-white/10 bg-[#0b0b0d] px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-white/25 hover:bg-zinc-900"
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
