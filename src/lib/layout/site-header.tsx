"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { appConfig } from "@/lib/config/app";

type NavItem = { href: string; label: string };
type SiteHeaderProps = { navItems: NavItem[]; whatsappUrl: string | null };

const navLinkClassName =
  "whitespace-nowrap border-b border-transparent px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#837f7c] transition hover:border-[#cec6c2] hover:text-[#cec6c2]";

export function SiteHeader({ navItems, whatsappUrl }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const mobileMenuId = useId();
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#cec6c2]/15 bg-[#141414]/96 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-5 px-4 py-3 sm:px-6 lg:px-8">
        <Link className="group flex min-w-0 shrink-0 items-center gap-3" href="/" onClick={closeMenu}>
          <span className="grid h-10 w-10 shrink-0 place-items-center border border-[#cec6c2] bg-[#cec6c2] text-[10px] font-black tracking-[-0.06em] text-[#141414] transition group-hover:bg-[#ded7d3]">
            MAT
          </span>
          <span className="min-w-0">
            <span className="neo-display block truncate text-[15px] leading-none text-[#cec6c2]">
              {appConfig.brandName}
            </span>
            <span className="mt-1 hidden truncate font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#837f7c] sm:block">
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
            className="inline-flex h-10 w-10 items-center justify-center border border-[#cec6c2]/40 bg-[#1b1b1b] text-[#cec6c2] transition hover:border-[#cec6c2]"
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
        <div className="border-t border-[#cec6c2]/15 bg-[#141414]/98 px-4 pb-5 shadow-2xl 2xl:hidden">
          <nav aria-label="Menú móvil" className="mx-auto grid w-full max-w-7xl gap-2 pt-3 sm:grid-cols-2" id={mobileMenuId}>
            {navItems.map((item, index) => (
              <Link
                className="group flex items-center justify-between border border-[#cec6c2]/12 bg-[#1b1b1b] px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#b7aaa4] transition hover:border-[#cec6c2]/55 hover:text-[#cec6c2]"
                href={item.href}
                key={item.href}
                onClick={closeMenu}
              >
                <span>{item.label}</span>
                <span className="font-mono text-[10px] text-[#837f7c]">{String(index + 1).padStart(2, "0")}</span>
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
