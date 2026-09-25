import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("includes collaborators in the main navigation", () => {
    render(<AppShell>Contenido</AppShell>);

    expect(screen.getByRole("link", { name: "Colaboradores" })).toHaveAttribute(
      "href",
      "/colaboradores",
    );
  });

  it("uses the configured WhatsApp phone in the global CTA URL", () => {
    render(<AppShell>Contenido</AppShell>);

    expect(screen.getByRole("link", { name: /WhatsApp/i })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/56977616917?"),
    );
  });

  it("renders a compact accessible mobile menu that can open and close", () => {
    render(<AppShell>Contenido</AppShell>);

    const menuButton = screen.getByRole("button", { name: "Abrir menú principal" });

    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Menú móvil" })).not.toBeInTheDocument();

    fireEvent.click(menuButton);

    const mobileMenu = screen.getByRole("navigation", { name: "Menú móvil" });

    expect(screen.getByRole("button", { name: "Cerrar menú principal" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(within(mobileMenu).getByRole("link", { name: "Portfolio" })).toHaveAttribute(
      "href",
      "/portfolio",
    );
    expect(within(mobileMenu).getByRole("link", { name: /WhatsApp/i })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/56977616917?"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Cerrar menú principal" }));

    expect(screen.queryByRole("navigation", { name: "Menú móvil" })).not.toBeInTheDocument();
  });

  it("keeps booking, contact and legal routes in the editorial footer", () => {
    render(<AppShell>Contenido</AppShell>);

    expect(screen.getByRole("link", { name: "Ir a contacto" })).toHaveAttribute("href", "/contacto");
    expect(screen.getByRole("link", { name: "Privacidad" })).toHaveAttribute("href", "/privacidad");
    expect(screen.getByRole("link", { name: "Términos" })).toHaveAttribute("href", "/terminos-reserva");
  });
});
