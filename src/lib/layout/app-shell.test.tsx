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

  it("uses the visible WhatsApp phone number in the global CTA URL", () => {
    render(<AppShell>Contenido</AppShell>);

    expect(screen.getByRole("link", { name: "WhatsApp +56 9 7761 6917" })).toHaveAttribute(
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
    expect(within(mobileMenu).getByRole("link", { name: "Portafolio" })).toHaveAttribute(
      "href",
      "/portfolio",
    );

    fireEvent.click(screen.getByRole("button", { name: "Cerrar menú principal" }));

    expect(screen.queryByRole("navigation", { name: "Menú móvil" })).not.toBeInTheDocument();
  });

  it("keeps an essential mobile WhatsApp CTA available without opening the menu", () => {
    render(<AppShell>Contenido</AppShell>);

    expect(screen.getByRole("link", { name: "Contactar por WhatsApp" })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/56977616917?"),
    );
  });
});
