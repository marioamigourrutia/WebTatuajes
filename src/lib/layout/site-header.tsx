"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { appConfig } from "@/lib/config/app";

type NavItem = { href: string; label: string };
type SiteHeaderProps = { navItems: NavItem[]; whatsappUrl: string | null };

const navLinkClassName =
  "whitespace-nowrap px-2 py-1.5 text-[9px] font-medium uppercase tracking-[0.08em] text-[#b7aaa4] transition hover:text-[#cec6c2]";

export function SiteHeader({ navItems, whatsappUrl }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const mobileMenuId = useId();
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#cec6c2]/12 bg-[#101010]/95 backdrop-blur-md">
      <div className="mx-auto flex h-11 w-full max-w-[1536px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link className="shrink-0" href="/" onClick={closeMenu}>
          <span className="block text-[9px] font-semibold uppercase tracking-[0.08em] text-[#cec6c2]">
            {appConfig.brandName}
          </span>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex"
        >
          {navItems
            .filter((item) => item.href !== "/admin")
            .map((item) => (
              <Link className={navLinkClassName} href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          {appConfig.instagramUrl ? (
            <a
              className={navLinkClassName}
              href={appConfig.instagramUrl}
              rel="noreferrer"
              target="_blank"
            >
              Instagram ↗
            </a>
          ) : null}
          <Link className={navLinkClassName} href="/admin">
            Admin
          </Link>
          {whatsappUrl ? (
            <a className={navLinkClassName} href={whatsappUrl} rel="noreferrer" target="_blank">
              WhatsApp ↗
            </a>
          ) : null}
          <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-[#66615e]">CL</span>
        </div>

        <button
          aria-controls={mobileMenuId}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Cerrar menú principal" : "Abrir menú principal"}
          className="inline-flex h-8 w-9 items-center justify-center border border-[#cec6c2]/25 text-[#cec6c2] xl:hidden"
          onClick={() => setIsMenuOpen((current) => !current)}
          type="button"
        >
          <span aria-hidden="true" className="grid gap-1.5">
            <span className="block h-px w-4 bg-current" />
            <span className="block h-px w-4 bg-current" />
          </span>
        </button>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-[#cec6c2]/12 bg-[#101010] px-4 pb-5 xl:hidden">
          <nav aria-label="Menú móvil" className="mx-auto grid w-full max-w-7xl pt-2" id={mobileMenuId}>
            {navItems.map((item, index) => (
              <Link
                className="flex items-center justify-between border-b border-[#cec6c2]/10 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#b7aaa4] transition hover:text-[#cec6c2]"
                href={item.href}
                key={item.href}
                onClick={closeMenu}
              >
                <span>{item.label}</span>
                <span className="font-mono text-[9px] text-[#66615e]">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </Link>
            ))}
            {appConfig.instagramUrl ? (
              <a
                className="mt-4 flex items-center justify-between border border-[#cec6c2]/20 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#cec6c2]"
                href={appConfig.instagramUrl}
                rel="noreferrer"
                target="_blank"
              >
                <span>Instagram</span>
                <span>↗</span>
              </a>
            ) : null}
            {whatsappUrl ? (
              <a
                className="mt-2 neo-button"
                href={whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                WhatsApp ↗
              </a>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
